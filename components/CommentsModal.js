import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, Modal, FlatList, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform,
  Alert, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, apiGet, apiPost, apiDelete, timeAgo } from '../utils';
import { useAuth } from '../contexts/AuthContext';

export default function CommentsModal({ visible, dealId, dealTitle, onClose }) {
  const { isLoggedIn, user } = useAuth();
  const [comments, setComments] = useState([]);
  const [loading, setLoading]   = useState(false);
  const [text, setText]         = useState('');
  const [replyTo, setReplyTo]   = useState(null); // { id, name }
  const [sending, setSending]   = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (visible && dealId) {
      load();
      // Mark notifications as read when opening comments
      apiPost('/api/notifications/read', {}).catch(() => {});
    } else { setComments([]); setReplyTo(null); setText(''); }
  }, [visible, dealId]);

  async function load() {
    setLoading(true);
    try { setComments(await apiGet(`/api/deals/${dealId}/comments`) || []); }
    catch(_) {} finally { setLoading(false); }
  }

  async function send() {
    const t = text.trim();
    if (!t) return;
    if (!isLoggedIn) return Alert.alert('Inicia sesión', 'Necesitas una cuenta para comentar.');
    setSending(true);
    try {
      await apiPost(`/api/deals/${dealId}/comments`, { text: t, parent_id: replyTo?.id || null });
      setText(''); setReplyTo(null);
      await load();
    } catch(_) { Alert.alert('Error', 'No se pudo enviar el comentario'); }
    finally { setSending(false); }
  }

  async function handleDelete(commentId) {
    Alert.alert('Eliminar comentario', '¿Eliminar este comentario?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: async () => {
        try {
          await apiDelete(`/api/comments/${commentId}`);
          await load();
        } catch(_) {}
      }},
    ]);
  }

  async function handleVote(commentId) {
    if (!isLoggedIn) return;
    try {
      await apiPost(`/api/comments/${commentId}/vote`, {});
      setComments(prev => updateVote(prev, commentId));
    } catch(_) {}
  }

  function updateVote(list, id) {
    return list.map(c => {
      if (c.id === id) return { ...c, votes_up: (c.votes_up||0)+1 };
      if (c.replies?.length) return { ...c, replies: updateVote(c.replies, id) };
      return c;
    });
  }

  function startReply(comment) {
    setReplyTo({ id: comment.id, name: comment.users?.name || 'alguien' });
    inputRef.current?.focus();
  }

  const totalCount = countComments(comments);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':'height'}>
        <View style={s.wrap}>
          {/* Header */}
          <View style={s.header}>
            <View style={{flex:1}}>
              <Text style={s.title}>💬 Comentarios ({totalCount})</Text>
              {dealTitle && <Text style={s.subtitle} numberOfLines={1}>{dealTitle}</Text>}
            </View>
            <TouchableOpacity onPress={onClose} style={s.closeBtn}>
              <Ionicons name="close" size={20} color={COLORS.text2}/>
            </TouchableOpacity>
          </View>

          {/* Comments list */}
          {loading
            ? <ActivityIndicator color={COLORS.primary} style={{marginTop:40}}/>
            : <FlatList
                data={comments}
                keyExtractor={c=>String(c.id)}
                contentContainerStyle={{padding:16,gap:12,paddingBottom:16}}
                renderItem={({item}) => (
                  <CommentItem
                    comment={item} depth={0} currentUser={user}
                    onReply={startReply} onDelete={handleDelete} onVote={handleVote}
                  />
                )}
                ListEmptyComponent={
                  <View style={s.empty}>
                    <Text style={{fontSize:40,textAlign:'center',marginBottom:8}}>💬</Text>
                    <Text style={s.emptyTxt}>Sin comentarios aún. ¡Sé el primero!</Text>
                  </View>
                }
              />
          }

          {/* Input */}
          <View style={s.inputWrap}>
            {replyTo && (
              <View style={s.replyBanner}>
                <Text style={s.replyTxt}>↩️ Respondiendo a <Text style={{fontWeight:'700'}}>{replyTo.name}</Text></Text>
                <TouchableOpacity onPress={()=>setReplyTo(null)}>
                  <Ionicons name="close-circle" size={16} color={COLORS.text3}/>
                </TouchableOpacity>
              </View>
            )}
            <View style={s.inputRow}>
              <TextInput
                ref={inputRef}
                style={s.input}
                value={text}
                onChangeText={setText}
                placeholder={isLoggedIn ? 'Añade un comentario...' : 'Inicia sesión para comentar'}
                placeholderTextColor={COLORS.text3}
                multiline maxLength={500}
                editable={isLoggedIn}
              />
              <TouchableOpacity
                style={[s.sendBtn, (!text.trim()||sending) && {opacity:0.5}]}
                onPress={send}
                disabled={!text.trim()||sending}
              >
                {sending
                  ? <ActivityIndicator color="#fff" size="small"/>
                  : <Ionicons name="send" size={18} color="#fff"/>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function CommentItem({ comment: c, depth, currentUser, onReply, onDelete, onVote }) {
  const isOwn = currentUser?.id === c.user_id;
  const avatar = c.users?.avatar_url;

  return (
    <View style={[cs.wrap, depth > 0 && cs.reply]}>
      <View style={cs.row}>
        {/* Avatar */}
        <View style={cs.avatarWrap}>
          {avatar
            ? <Image source={{uri:avatar}} style={cs.avatar}/>
            : <View style={cs.avatarFallback}><Text style={cs.avatarTxt}>{(c.users?.name||'?')[0].toUpperCase()}</Text></View>
          }
        </View>
        {/* Content */}
        <View style={{flex:1}}>
          <View style={cs.metaRow}>
            <Text style={cs.name}>{c.users?.name||'Anónimo'}</Text>
            <Text style={cs.time}>{timeAgo(c.created_at)}</Text>
          </View>
          <Text style={[cs.text, c.is_deleted && {fontStyle:'italic',color:COLORS.text3}]}>
            {c.text}
          </Text>
          <View style={cs.actions}>
            <TouchableOpacity style={cs.actionBtn} onPress={()=>onVote(c.id)}>
              <Ionicons name="thumbs-up-outline" size={13} color={COLORS.text3}/>
              {(c.votes_up||0) > 0 && <Text style={cs.actionTxt}>{c.votes_up}</Text>}
            </TouchableOpacity>
            {!c.is_deleted && (
              <TouchableOpacity style={cs.actionBtn} onPress={()=>onReply(c)}>
                <Ionicons name="return-down-forward-outline" size={13} color={COLORS.text3}/>
                <Text style={cs.actionTxt}>Responder</Text>
              </TouchableOpacity>
            )}
            {isOwn && !c.is_deleted && (
              <TouchableOpacity style={cs.actionBtn} onPress={()=>onDelete(c.id)}>
                <Ionicons name="trash-outline" size={13} color={COLORS.danger}/>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
      {/* Replies */}
      {(c.replies||[]).map(r => (
        <CommentItem key={r.id} comment={r} depth={depth+1} currentUser={currentUser} onReply={onReply} onDelete={onDelete} onVote={onVote}/>
      ))}
    </View>
  );
}

function countComments(list) {
  return list.reduce((sum, c) => sum + 1 + countComments(c.replies||[]), 0);
}

const s = StyleSheet.create({
  wrap:{flex:1,backgroundColor:COLORS.bg2},
  header:{flexDirection:'row',alignItems:'flex-start',padding:16,borderBottomWidth:0.5,borderBottomColor:COLORS.border,gap:12},
  title:{fontSize:17,fontWeight:'700',color:COLORS.text},
  subtitle:{fontSize:12,color:COLORS.text3,marginTop:2},
  closeBtn:{width:32,height:32,borderRadius:16,backgroundColor:COLORS.bg3,alignItems:'center',justifyContent:'center'},
  empty:{paddingVertical:40,alignItems:'center'},
  emptyTxt:{fontSize:15,color:COLORS.text3},
  inputWrap:{borderTopWidth:0.5,borderTopColor:COLORS.border,paddingHorizontal:12,paddingVertical:10,backgroundColor:COLORS.bg2},
  replyBanner:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',backgroundColor:COLORS.primaryLight,borderRadius:8,paddingHorizontal:10,paddingVertical:6,marginBottom:8},
  replyTxt:{fontSize:12,color:COLORS.primary},
  inputRow:{flexDirection:'row',alignItems:'flex-end',gap:8},
  input:{flex:1,backgroundColor:COLORS.bg3,borderRadius:14,paddingHorizontal:14,paddingVertical:10,fontSize:14,color:COLORS.text,maxHeight:100,borderWidth:1,borderColor:COLORS.border},
  sendBtn:{width:42,height:42,borderRadius:21,backgroundColor:COLORS.primary,alignItems:'center',justifyContent:'center'},
});

const cs = StyleSheet.create({
  wrap:{gap:8},
  reply:{marginLeft:32,paddingLeft:12,borderLeftWidth:2,borderLeftColor:COLORS.border},
  row:{flexDirection:'row',gap:10},
  avatarWrap:{paddingTop:2},
  avatar:{width:34,height:34,borderRadius:17},
  avatarFallback:{width:34,height:34,borderRadius:17,backgroundColor:COLORS.primaryLight,alignItems:'center',justifyContent:'center'},
  avatarTxt:{fontSize:14,fontWeight:'700',color:COLORS.primary},
  metaRow:{flexDirection:'row',alignItems:'center',gap:8,marginBottom:4},
  name:{fontSize:13,fontWeight:'700',color:COLORS.text},
  time:{fontSize:11,color:COLORS.text3},
  text:{fontSize:14,color:COLORS.text,lineHeight:20},
  actions:{flexDirection:'row',gap:12,marginTop:6},
  actionBtn:{flexDirection:'row',alignItems:'center',gap:4},
  actionTxt:{fontSize:12,color:COLORS.text3},
});
