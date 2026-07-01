import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../config/supabase'
import { useAuth } from './AuthContext'

const CollectionContext = createContext(null)

export function CollectionProvider({ children }) {
  const { user, isLoggedIn } = useAuth()
  const [myCards, setMyCards] = useState([]) // user_experiences with experience joined
  const [loading, setLoading] = useState(false)
  const [collectedIds, setCollectedIds] = useState(new Set())

  useEffect(() => {
    if (isLoggedIn && user) loadMyCards()
    else { setMyCards([]); setCollectedIds(new Set()) }
  }, [isLoggedIn, user])

  async function loadMyCards() {
    setLoading(true)
    try {
      const { data } = await supabase
        .from('user_experiences')
        .select(`
          *,
          experience:experiences(
            id, title, description, rarity, difficulty, cost_level,
            category_id, template_url, card_count,
            category:categories(key, name_es, icon, color)
          )
        `)
        .eq('user_id', user.id)
        .order('obtained_at', { ascending: false })

      setMyCards(data ?? [])
      setCollectedIds(new Set((data ?? []).map(ue => ue.experience_id)))
    } finally {
      setLoading(false)
    }
  }

  async function collectCard(experienceId, photoUri = null) {
    let photoUrl = null

    if (photoUri) {
      const filename = `${user.id}/${experienceId}.jpg`
      const response = await fetch(photoUri)
      const blob = await response.blob()
      const { error: uploadError } = await supabase.storage
        .from('card-photos')
        .upload(filename, blob, { upsert: true, contentType: 'image/jpeg' })
      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('card-photos')
        .getPublicUrl(filename)
      photoUrl = publicUrl
    }

    const { data, error } = await supabase
      .from('user_experiences')
      .insert({ user_id: user.id, experience_id: experienceId, photo_url: photoUrl })
      .select(`
        *,
        experience:experiences(
          id, title, description, rarity, difficulty, cost_level,
          category_id, template_url, card_count,
          category:categories(key, name_es, icon, color)
        )
      `)
      .single()

    if (error) throw error

    setMyCards(prev => [data, ...prev])
    setCollectedIds(prev => new Set([...prev, experienceId]))
    return data
  }

  async function updateCardPhoto(userExperienceId, photoUri) {
    const existing = myCards.find(c => c.id === userExperienceId)
    if (!existing) throw new Error('Card not found')

    const filename = `${user.id}/${existing.experience_id}.jpg`
    const response = await fetch(photoUri)
    const blob = await response.blob()
    await supabase.storage
      .from('card-photos')
      .upload(filename, blob, { upsert: true, contentType: 'image/jpeg' })

    const { data: { publicUrl } } = supabase.storage
      .from('card-photos')
      .getPublicUrl(filename)

    const { data, error } = await supabase
      .from('user_experiences')
      .update({ photo_url: publicUrl })
      .eq('id', userExperienceId)
      .select()
      .single()
    if (error) throw error

    setMyCards(prev => prev.map(c => c.id === userExperienceId ? { ...c, photo_url: publicUrl } : c))
    return data
  }

  function isCollected(experienceId) {
    return collectedIds.has(experienceId)
  }

  function getMyCard(experienceId) {
    return myCards.find(c => c.experience_id === experienceId)
  }

  return (
    <CollectionContext.Provider value={{
      myCards,
      loading,
      collectCard,
      updateCardPhoto,
      isCollected,
      getMyCard,
      refresh: loadMyCards,
    }}>
      {children}
    </CollectionContext.Provider>
  )
}

export function useCollection() {
  const ctx = useContext(CollectionContext)
  if (!ctx) throw new Error('useCollection must be used within CollectionProvider')
  return ctx
}
