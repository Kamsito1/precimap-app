import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TextInput, TouchableOpacity, FlatList, ActivityIndicator, KeyboardAvoidingView, Platform, Image, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, apiGet, apiPost, apiDelete, timeAgo } from '../utils';
import { useAuth } from '../contexts/AuthContext';

export default function CommentsModal({ visible, dealId, eventId, onClose }) {
  const { isLoggedIn, user } = useAuth();
  const isAdmin = user?.is_admin;
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  const targetId = dealId || eventId;
  const apiBase = dealId ? `/api/deals/${dealId}/comments` : `/api/events/${eventId}/comments`;

  useEffect(() => { if (visible && targetId) { loadComments(); } else { setComments([]); } }, [visible, targetId]);

  async function loadComments() {
    setLoading(true);
    try {
      const data = await apiGet(apiBase);
      const flat = Array.isArray(data) ? data : [];
      // Flatten any nested replies
      const all = [];
      function walk(items) { items.forEach(c => { all.push(c); if (c.replies) walk(c.replies); }); }
      walk(flat);
      setComments(all);
    } catch(_) {} finally { setLoading(false); }
  }

  async function sendComment() {
    if (!text.trim() || !isLoggedIn || sending) return;
    setSending(true);
    try {
      const res = await apiPost(apiBase, { text: text.trim() });
      if (res?.error) { Alert.alert('Error', res.error); }
      else { setText(''); await loadComments(); }
    } catch(e) { Alert.alert('Error', 'No se pudo enviar'); }
    finally { setSending(false); }
  }

  async function deleteComment(id) {
    Alert.alert('Eliminar', '¿Eliminar este comentario?', [
      { text: 'Cancelar' },
      { text: 'Eliminar', style: 'destructive', onPress: async () => {
        try { await apiDelete(`/api/comments/${id}`); loadComments(); }
        catch(_) { Alert.alert('Error'); }
      }}
    ]);
  }

  const canDelete = (c) => isAdmin || c.user_id === user?.id;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{flex:1,backgroundColor:COLORS.bg2}} behavior={Platform.OS==='ios'?'padding':'height'}>
        <View style={{width:40,height:4,borderRadius:99,backgroundColor:COLORS.border,alignSelf:'center',marginTop:10}}/>
        <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',padding:16,borderBottomWidth:0.5,borderBottomColor:COLORS.border}}>
          <View style={{flexDirection:'row',alignItems:'center',gap:8}}>
            <Ionicons name="chatbubbles" size={20} color={COLORS.primary}/>
            <Text style={{fontSize:18,fontWeight:'700',color:COLORS.text}}>Comentarios</Text>
            {comments.length>0&&<View style={{backgroundColor:COLORS.primaryLight,borderRadius:10,paddingHorizontal:7,paddingVertical:1}}>
              <Text style={{fontSize:11,fontWeight:'700',color:COLORS.primary}}>{comments.length}</Text>
            </View>}
          </View>
          <TouchableOpacity onPress={onClose} style={{width:32,height:32,borderRadius:16,backgroundColor:COLORS.bg3,alignItems:'center',justifyContent:'center'}}>
            <Ionicons name="close" size={20} color={COLORS.text2}/>
          </TouchableOpacity>
        </View>

        {loading ? <ActivityIndicator color={COLORS.primary} style={{marginTop:30}}/> : (
          <FlatList data={comments} keyExtractor={c=>`c_${c.id}`}
            contentContainerStyle={{padding:16,gap:12,paddingBottom:80}}
            renderItem={({item:c})=>{
              const avatar = c.users?.avatar_url;
              const name = c.users?.name || c.user_name || 'Usuario';
              const initial = name.charAt(0).toUpperCase();
              return (
                <View style={{flexDirection:'row',gap:10}}>
                  {/* Avatar */}
                  {avatar ? (
                    <Image source={{uri:avatar}} style={{width:34,height:34,borderRadius:17,backgroundColor:COLORS.bg3}}/>
                  ) : (
                    <View style={{width:34,height:34,borderRadius:17,backgroundColor:COLORS.primaryLight,alignItems:'center',justifyContent:'center'}}>
                      <Text style={{fontSize:14,fontWeight:'800',color:COLORS.primary}}>{initial}</Text>
                    </View>
                  )}
                  {/* Content */}
                  <View style={{flex:1}}>
                    <View style={{backgroundColor:COLORS.bg3,borderRadius:14,borderTopLeftRadius:4,padding:12}}>
                      <View style={{flexDirection:'row',alignItems:'center',gap:5,marginBottom:3}}>
                        <Text style={{fontSize:13,fontWeight:'700',color:COLORS.text}}>{name}</Text>
                        <Text style={{fontSize:10,color:COLORS.text3}}>{timeAgo(c.created_at)}</Text>
                      </View>
                      <Text style={{fontSize:14,color:COLORS.text,lineHeight:20}}>{c.text||c.content}</Text>
                    </View>
                    {canDelete(c)&&(
                      <TouchableOpacity onPress={()=>deleteComment(c.id)}
                        style={{flexDirection:'row',alignItems:'center',gap:3,paddingTop:4,paddingLeft:4}}>
                        <Ionicons name="trash-outline" size={11} color={COLORS.text3}/>
                        <Text style={{fontSize:10,color:COLORS.text3}}>Eliminar</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            }}
            ListEmptyComponent={
              <View style={{alignItems:'center',paddingTop:40,gap:8}}>
                <View style={{width:50,height:50,borderRadius:25,backgroundColor:COLORS.primaryLight,alignItems:'center',justifyContent:'center'}}>
                  <Ionicons name="chatbubbles-outline" size={24} color={COLORS.primary}/>
                </View>
                <Text style={{fontSize:15,fontWeight:'700',color:COLORS.text}}>Sin comentarios</Text>
                <Text style={{fontSize:12,color:COLORS.text3}}>Sé el primero en comentar</Text>
              </View>
            }/>
        )}
        {isLoggedIn ? (
          <View style={{flexDirection:'row',alignItems:'center',gap:8,padding:12,paddingBottom:Platform.OS==='ios'?28:12,borderTopWidth:0.5,borderTopColor:COLORS.border,backgroundColor:COLORS.bg2}}>
            {user?.avatar_url ? (
              <Image source={{uri:user.avatar_url}} style={{width:30,height:30,borderRadius:15}}/>
            ) : (
              <View style={{width:30,height:30,borderRadius:15,backgroundColor:COLORS.primaryLight,alignItems:'center',justifyContent:'center'}}>
                <Text style={{fontSize:12,fontWeight:'800',color:COLORS.primary}}>{(user?.name||'U').charAt(0).toUpperCase()}</Text>
              </View>
            )}
            <TextInput style={{flex:1,backgroundColor:COLORS.bg3,borderRadius:20,paddingHorizontal:14,paddingVertical:9,fontSize:14,color:COLORS.text,borderWidth:1,borderColor:COLORS.border}}
              value={text} onChangeText={setText} placeholder="Escribe un comentario..." placeholderTextColor={COLORS.text3}
              returnKeyType="send" onSubmitEditing={sendComment}/>
            <TouchableOpacity style={{width:36,height:36,borderRadius:18,backgroundColor:text.trim()?COLORS.primary:COLORS.bg3,alignItems:'center',justifyContent:'center'}}
              onPress={sendComment} disabled={!text.trim()||sending}>
              {sending?<ActivityIndicator size="small" color="#fff"/>:<Ionicons name="send" size={16} color={text.trim()?'#fff':COLORS.text3}/>}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{padding:16,alignItems:'center',borderTopWidth:0.5,borderTopColor:COLORS.border}}>
            <Text style={{fontSize:13,color:COLORS.text3}}>Inicia sesión para comentar</Text>
          </View>
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
}
