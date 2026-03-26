import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Image, ActivityIndicator, RefreshControl, Linking, Alert, TextInput, Modal, Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, apiGet, apiPost, apiDelete, timeAgo, applyAffiliateTag, formatPrice, API_BASE } from '../utils';
import { useAuth } from '../contexts/AuthContext';
import AuthModal from '../components/AuthModal';
import CommentsModal from '../components/CommentsModal';
import AddDealModal from '../components/AddDealModal';

const CATS = [
  { key:'all',          label:'Todos',        emoji:'🔥' },
  { key:'tecnologia',   label:'Tech',          emoji:'💻' },
  { key:'moda',         label:'Moda',          emoji:'👗' },
  { key:'hogar',        label:'Hogar',         emoji:'🏠' },
  { key:'alimentacion', label:'Súper',         emoji:'🛒' },
  { key:'viajes',       label:'Viajes',        emoji:'✈️' },
  { key:'juegos',       label:'Gaming',        emoji:'🎮' },
  { key:'belleza',      label:'Belleza',       emoji:'💄' },
  { key:'deportes',     label:'Deporte',       emoji:'⚽' },
  { key:'libros',       label:'Libros',        emoji:'📚' },
  { key:'coches',       label:'Motor',         emoji:'🚗' },
  { key:'otros',        label:'Otros',         emoji:'🏷️' },
];

const SORTS = [
  { key:'hot',   label:'🔥 Top',    desc:'Más votados' },
  { key:'new',   label:'🆕 Nuevo',  desc:'Más recientes' },
  { key:'top',   label:'👑 Mejor',  desc:'Históricamente mejor' },
  { key:'price', label:'💰 Precio', desc:'Más baratos primero' },
];

export default function DealsScreen() {
  const { isLoggedIn, user } = useAuth();
  const [deals, setDeals]         = useState([]);
  const [cat, setCat]               = useState('all');
  const [sort, setSort]             = useState('hot');
  const [minDiscount, setMinDiscount] = useState(0); // 0=all, 20, 30, 50
  const [search, setSearch]         = useState('');
  const [myVotes, setMyVotes]       = useState({});
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset]         = useState(0);
  const [hasMore, setHasMore]       = useState(true);
  const PAGE = 20;
  const [showAuth, setShowAuth]     = useState(false);
  const [showAdd, setShowAdd]       = useState(false);
  const [commentsFor, setCommentsFor] = useState(null);
  const [editDeal, setEditDeal]     = useState(null);  // deal being edited
  const [editPrice, setEditPrice]   = useState('');
  const [editTitle, setEditTitle]   = useState('');

  useEffect(() => { resetAndLoad(); }, [cat, sort, minDiscount]);

  // Debounced search — waits 400ms after typing stops before fetching
  useEffect(() => {
    const timer = setTimeout(() => { resetAndLoad(); }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const t = setTimeout(() => resetAndLoad(), 400);
    return () => clearTimeout(t);
  }, [search]);

  function resetAndLoad() {
    setOffset(0); setHasMore(true); load(0, true);
  }

  async function load(off = 0, reset = false) {
    try {
      let url = `/api/deals?cat=${cat}&sort=${sort}&limit=${PAGE}&offset=${off}`;
      if (search.trim()) url += `&search=${encodeURIComponent(search.trim())}`;
      if (minDiscount > 0) url += `&min_discount=${minDiscount}`;
      const data = await apiGet(url) || [];
      if (reset) setDeals(data);
      else setDeals(prev => [...prev, ...data]);
      setHasMore(data.length === PAGE);
      setOffset(off + data.length);
    } catch {} finally { setLoading(false); setRefreshing(false); setLoadingMore(false); }
  }

  const onRefresh = useCallback(() => { setRefreshing(true); resetAndLoad(); }, [cat, sort, search]);

  function onEndReached() {
    if (loadingMore || !hasMore || loading) return;
    setLoadingMore(true);
    load(offset, false);
  }

  async function vote(dealId, v) {
    if (!isLoggedIn) return setShowAuth(true);
    const prev = myVotes[dealId];
    const newVote = prev === v ? 0 : v; // toggle off if same
    setMyVotes(mv => ({ ...mv, [dealId]: newVote }));
    // Optimistic update on deal count
    setDeals(prev => prev.map(d => d.id === dealId ? {
      ...d,
      votes_up:   d.votes_up   + (newVote===1?1 : prev===1?-1:0),
      votes_down: d.votes_down + (newVote===-1?1: prev===-1?-1:0),
    } : d));
    try { await apiPost(`/api/deals/${dealId}/vote`, { vote: newVote === 0 ? -v : v }); }
    catch { /* revert on error */ setMyVotes(mv => ({ ...mv, [dealId]: prev })); }
  }

  function temperature(up = 0, down = 0) {
    const score = up - down;
    if (score >= 50) return { label: '🔥🔥🔥 Ardiendo', color: '#DC2626' };
    if (score >= 20) return { label: '🔥🔥 Muy caliente', color: '#EA580C' };
    if (score >= 5)  return { label: '🔥 Caliente', color: '#D97706' };
    if (score >= 0)  return { label: '😐 Tibio', color: '#6B7280' };
    return { label: '🧊 Frío', color: '#3B82F6' };
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <View style={s.headerTop}>
          <View>
            <Text style={s.title}>🔥 Chollos</Text>
            <Text style={s.sub}>
              {deals.length > 0
                ? (() => {
                    const discs = deals.filter(d => d.discount_percent > 0).map(d => d.discount_percent || 0);
                    const filterTxt = minDiscount > 0 ? ` · filtro -${minDiscount}%+` : '';
                    const searchTxt = search.trim() ? ` · "${search.trim()}"` : '';
                    return `${deals.length} ofertas${discs.length ? ' · mejor ' + Math.max(...discs).toFixed(0) + '%' : ''}${filterTxt}${searchTxt}`;
                  })()
                : loading ? 'Cargando chollos...' : 'Sin chollos con ese filtro'
              }
            </Text>
          </View>
          <TouchableOpacity style={s.addBtn} onPress={() => isLoggedIn ? setShowAdd(true) : setShowAuth(true)}>
            <Ionicons name="add" size={18} color="#fff"/>
            <Text style={s.addBtnTxt}>Publicar</Text>
          </TouchableOpacity>
        </View>

        {/* Search bar */}
        <View style={s.searchRow}>
          <Ionicons name="search-outline" size={16} color={COLORS.text3} style={{marginRight:8}}/>
          <TextInput
            style={s.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Buscar chollos... (ej: iPhone, zapatillas, vuelo)"
            placeholderTextColor={COLORS.text3}
            returnKeyType="search"
            autoCorrect={false}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color={COLORS.text3}/>
            </TouchableOpacity>
          )}
        </View>

        {/* Sort tabs */}
        <View style={s.sortRow}>
          {SORTS.map(so => (
            <TouchableOpacity key={so.key} style={[s.sortBtn, sort===so.key && s.sortBtnOn]} onPress={() => setSort(so.key)}>
              <Text style={[s.sortTxt, sort===so.key && {color:'#fff',fontWeight:'700'}]}>{so.label}</Text>
            </TouchableOpacity>
          ))}
          <View style={{flex:1}}/>
          {[0,20,30,50].map(d => (
            <TouchableOpacity key={d} style={[s.sortBtn, minDiscount===d && {backgroundColor:COLORS.danger,borderColor:COLORS.danger}]}
              onPress={() => setMinDiscount(d)}>
              <Text style={[s.sortTxt, minDiscount===d && {color:'#fff',fontWeight:'700'}]}>
                {d===0 ? 'Todo' : `-${d}%+`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Category pills */}
        <FlatList
          horizontal data={CATS} keyExtractor={c=>c.key} showsHorizontalScrollIndicator={false}
          contentContainerStyle={{paddingHorizontal:12,gap:6,paddingBottom:10}}
          renderItem={({item:c}) => (
            <TouchableOpacity style={[s.catBtn, cat===c.key && s.catBtnOn]} onPress={()=>setCat(c.key)}>
              <Text style={s.catEmoji}>{c.emoji}</Text>
              <Text style={[s.catTxt, cat===c.key && {color:'#fff',fontWeight:'600'}]}>{c.label}</Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {!isLoggedIn && (
        <TouchableOpacity style={s.guestBanner} onPress={() => setShowAuth(true)}>
          <Text style={s.guestTxt}>🔥 Inicia sesión para votar y comentar →</Text>
        </TouchableOpacity>
      )}

      {loading ? (
        <View style={{padding:12,gap:12}}>
          {[1,2,3].map(i=>(
            <View key={i} style={[s.card,{overflow:'hidden'}]}>
              <View style={{height:140,backgroundColor:COLORS.bg3}}/>
              <View style={{padding:14,gap:8}}>
                <View style={{height:14,backgroundColor:COLORS.bg3,borderRadius:7,width:'80%'}}/>
                <View style={{height:14,backgroundColor:COLORS.bg3,borderRadius:7,width:'60%'}}/>
                <View style={{height:24,backgroundColor:COLORS.bg3,borderRadius:7,width:'40%'}}/>
              </View>
            </View>
          ))}
        </View>
      ) : (
        <FlatList
          data={deals} keyExtractor={d=>String(d.id)}
          contentContainerStyle={{padding:12,gap:12,paddingBottom:100}}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.danger}/>}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.3}
          ListFooterComponent={loadingMore ? (
            <View style={{paddingVertical:20,alignItems:'center'}}>
              <ActivityIndicator color={COLORS.danger}/>
              <Text style={{fontSize:12,color:COLORS.text3,marginTop:6}}>Cargando más chollos...</Text>
            </View>
          ) : (!hasMore && deals.length > 0) ? (
            <View style={{paddingVertical:20,alignItems:'center'}}>
              <Text style={{fontSize:12,color:COLORS.text3}}>— Has visto todos los chollos —</Text>
            </View>
          ) : null}
          renderItem={({item:deal}) => {
            const temp = deal.temperature
              ? { label: deal.temperature, color: deal.temp_color }
              : temperature(deal.votes_up, deal.votes_down);
            const affUrl = applyAffiliateTag(deal.url);
            const catEmoji = CATS.find(c=>c.key===deal.category)?.emoji || '🏷️';
            const catColor = {tecnologia:'#3B82F6',moda:'#EC4899',hogar:'#F59E0B',alimentacion:'#22C55E',viajes:'#6366F1',juegos:'#8B5CF6',belleza:'#F43F5E',deportes:'#14B8A6',libros:'#78716C',coches:'#64748B',otros:'#94A3B8'}[deal.category] || '#94A3B8';
            return (
              <View style={s.card}>
                {/* Temp badge */}
                <View style={[s.tempBadge, {backgroundColor: temp.color+'20'}]}>
                  <Text style={[s.tempTxt, {color: temp.color}]}>{temp.label}</Text>
                </View>

                {/* Image or category placeholder */}
                {deal.image_url ? (
                  <TouchableOpacity onPress={() => affUrl && Linking.openURL(affUrl)} activeOpacity={0.9}>
                    <Image source={{uri: deal.image_url.startsWith('/') ? `${API_BASE}${deal.image_url}` : deal.image_url}}
                      style={s.img} resizeMode="cover"/>
                  </TouchableOpacity>
                ) : (
                  <View style={[s.imgPlaceholder, {backgroundColor: catColor+'18'}]}>
                    <Text style={{fontSize:52}}>{catEmoji}</Text>
                    {deal.store && <Text style={{fontSize:13,color:catColor,fontWeight:'700',marginTop:8}}>{deal.store}</Text>}
                  </View>
                )}

                <View style={s.cardBody}>
                  {/* Store + category */}
                  <View style={s.metaRow}>
                    {deal.store && <View style={s.storeBadge}><Text style={s.storeTxt}>{deal.store}</Text></View>}
                    <View style={s.catTag}><Text style={s.catTagTxt}>{CATS.find(c=>c.key===deal.category)?.emoji} {deal.category}</Text></View>
                    <Text style={s.ageTag}>{timeAgo(deal.detected_at)}</Text>
                    {deal.users?.name && (
                      <Text style={[s.ageTag,{color:COLORS.text3}]}>por {deal.users.name.split(' ')[0]}</Text>
                    )}
                    {deal.expires_at && (() => {
                      const daysLeft = Math.ceil((new Date(deal.expires_at) - Date.now()) / 86400000);
                      if (daysLeft <= 3) return <Text style={s.expireTag}>⏰ {daysLeft}d</Text>;
                      return null;
                    })()}
                  </View>

                  {/* Title */}
                  <Text style={s.dealTitle} numberOfLines={3}>{deal.title}</Text>

                  {/* Price — enhanced layout */}
                  <View style={s.priceRow}>
                    <Text style={s.dealPrice}>{formatPrice(deal.deal_price)}</Text>
                    {deal.original_price && <Text style={s.origPrice}>{formatPrice(deal.original_price)}</Text>}
                    {deal.discount_percent && deal.discount_percent >= 5 && (
                      <View style={[s.discBadge, deal.discount_percent >= 30 && {backgroundColor:'#DC2626'}]}>
                        <Text style={s.discTxt}>-{Math.round(deal.discount_percent)}%</Text>
                      </View>
                    )}
                    {deal.original_price && deal.deal_price && (
                      <Text style={{fontSize:11,color:COLORS.success,fontWeight:'600',marginLeft:4}}>
                        ahorras {formatPrice(deal.original_price - deal.deal_price)}
                      </Text>
                    )}
                  </View>

                  {/* Reporter */}
                  <View style={s.reporterRow}>
                    <View style={s.reporterAvatar}>
                      {deal.users?.avatar_url
                        ? <Image source={{uri:deal.users.avatar_url}} style={{width:18,height:18,borderRadius:9}}/>
                        : <Text style={{fontSize:10,color:COLORS.primary,fontWeight:'700'}}>{(deal.users?.name||'?')[0]}</Text>
                      }
                    </View>
                    <Text style={s.reporterName}>{deal.users?.name || 'Anónimo'}</Text>
                  </View>
                </View>

                {/* Actions */}
                <View style={s.actions}>
                  {/* Votes */}
                  <View style={s.voteGroup}>
                    <TouchableOpacity
                      style={[s.voteBtn, myVotes[deal.id]===1 && {backgroundColor:'#FEE2E2'}]}
                      onPress={() => vote(deal.id, 1)}>
                      <Ionicons name={myVotes[deal.id]===1 ? "flame" : "flame-outline"} size={22} color={COLORS.danger}/>
                      <Text style={[s.voteNum, {color:COLORS.danger}]}>{deal.votes_up||0}</Text>
                    </TouchableOpacity>
                    <View style={s.voteDivider}/>
                    <TouchableOpacity
                      style={[s.voteBtn, myVotes[deal.id]===-1 && {backgroundColor:'#EFF6FF'}]}
                      onPress={() => vote(deal.id, -1)}>
                      <Ionicons name={myVotes[deal.id]===-1 ? "snow" : "snow-outline"} size={22} color={COLORS.primary}/>
                      <Text style={[s.voteNum, {color:COLORS.primary}]}>{deal.votes_down||0}</Text>
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity style={s.commentBtn} onPress={() => setCommentsFor(deal)}>
                    <Ionicons name="chatbubble-outline" size={17} color={COLORS.text2}/>
                    <Text style={s.commentCount}>{deal.comment_count||0}</Text>
                  </TouchableOpacity>

                  {/* Share deal */}
                  <TouchableOpacity
                    style={s.commentBtn}
                    onPress={() => {
                      const price = formatPrice(deal.deal_price);
                      const disc  = deal.discount_percent ? ` (-${Math.round(deal.discount_percent)}%)` : '';
                      const url   = deal.url ? `\n🔗 ${deal.url}` : '';
                      Share.share({
                        message: `🔥 ${deal.title}\n💰 ${price}${disc}${url}\n\nVía PreciMap — La app de ahorro de España`,
                      }).catch(() => {});
                    }}>
                    <Ionicons name="share-outline" size={17} color={COLORS.text2}/>
                  </TouchableOpacity>

                  {affUrl && (
                    <TouchableOpacity style={s.goBtn} onPress={() => Linking.openURL(affUrl)}>
                      <Text style={s.goBtnTxt}>Ver oferta</Text>
                      <Ionicons name="arrow-forward" size={14} color="#fff"/>
                    </TouchableOpacity>
                  )}

                  {/* Report as expired — any logged in user */}
                  {isLoggedIn && deal.reported_by !== user?.id && (
                    <TouchableOpacity
                      style={s.expiredBtn}
                      onPress={() => Alert.alert(
                        '⏰ ¿Ya no disponible?',
                        'Si el precio ha subido o la oferta ya no está activa, marca el chollo como frío con ❄️ para que baje de temperatura.',
                        [{ text: 'Marcar como frío ❄️', onPress: () => vote(deal.id, -1) }, { text: 'Cancelar', style: 'cancel' }]
                      )}>
                      <Ionicons name="alert-circle-outline" size={16} color={COLORS.text3}/>
                    </TouchableOpacity>
                  )}

                  {isLoggedIn && deal.reported_by === user?.id && (
                    <View style={{flexDirection:'row',gap:8,alignItems:'center'}}>
                      <TouchableOpacity onPress={() => {
                        setEditDeal(deal);
                        setEditPrice(String(deal.deal_price||''));
                        setEditTitle(deal.title||'');
                      }}>
                        <Ionicons name="pencil-outline" size={17} color={COLORS.primary}/>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => {
                        Alert.alert('¿Eliminar chollo?', 'Esta acción no se puede deshacer.', [
                          { text: 'Cancelar', style: 'cancel' },
                          { text: 'Eliminar', style: 'destructive', onPress: async () => {
                            await apiDelete(`/api/deals/${deal.id}`);
                            setDeals(prev => prev.filter(d => d.id !== deal.id));
                          }},
                        ]);
                      }}>
                        <Ionicons name="trash-outline" size={17} color={COLORS.danger}/>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={s.empty}>
              <Text style={{fontSize:52,textAlign:'center',marginBottom:12}}>{search ? '🔍' : '🛍️'}</Text>
              <Text style={s.emptyTitle}>{search ? `Sin resultados para "${search}"` : cat !== 'all' ? `Sin chollos en esta categoría` : 'Sin chollos aún'}</Text>
              <Text style={s.emptyDesc}>
                {search ? 'Prueba con otro término o borra la búsqueda.' : 'Sé el primero en publicar una oferta increíble para la comunidad.'}
              </Text>
              {!search && (
                <TouchableOpacity style={s.emptyBtn} onPress={() => isLoggedIn ? setShowAdd(true) : setShowAuth(true)}>
                  <Text style={s.emptyBtnTxt}>Publicar chollo</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}

      <AddDealModal visible={showAdd} onClose={() => setShowAdd(false)} onSuccess={() => { setShowAdd(false); load(); }}/>
      <CommentsModal visible={!!commentsFor} dealId={commentsFor?.id} dealTitle={commentsFor?.title} onClose={() => setCommentsFor(null)}/>
      <AuthModal visible={showAuth} onClose={() => setShowAuth(false)}/>

      {/* Edit deal modal */}
      <Modal visible={!!editDeal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setEditDeal(null)}>
        <View style={{flex:1,backgroundColor:COLORS.bg2}}>
          <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',padding:16,borderBottomWidth:0.5,borderBottomColor:COLORS.border}}>
            <Text style={{fontSize:17,fontWeight:'700',color:COLORS.text}}>✏️ Editar chollo</Text>
            <TouchableOpacity onPress={() => setEditDeal(null)} style={{width:32,height:32,borderRadius:16,backgroundColor:COLORS.bg3,alignItems:'center',justifyContent:'center'}}>
              <Ionicons name="close" size={20} color={COLORS.text2}/>
            </TouchableOpacity>
          </View>
          <View style={{padding:16,gap:14}}>
            <View>
              <Text style={{fontSize:13,fontWeight:'600',color:COLORS.text,marginBottom:6}}>Título</Text>
              <TextInput style={{backgroundColor:COLORS.bg3,borderRadius:10,borderWidth:1.5,borderColor:COLORS.border,paddingHorizontal:12,paddingVertical:10,fontSize:14,color:COLORS.text}}
                value={editTitle} onChangeText={setEditTitle} placeholder="Título del chollo" placeholderTextColor={COLORS.text3} maxLength={120}/>
            </View>
            <View>
              <Text style={{fontSize:13,fontWeight:'600',color:COLORS.text,marginBottom:6}}>Precio (€)</Text>
              <TextInput style={{backgroundColor:COLORS.bg3,borderRadius:10,borderWidth:1.5,borderColor:COLORS.border,paddingHorizontal:12,paddingVertical:10,fontSize:22,fontWeight:'700',color:COLORS.primary}}
                value={editPrice} onChangeText={setEditPrice} keyboardType="numeric" placeholder="0.00" placeholderTextColor={COLORS.text3}/>
            </View>
            <TouchableOpacity
              style={{backgroundColor:COLORS.primary,borderRadius:12,paddingVertical:14,alignItems:'center'}}
              onPress={async () => {
                if (!editTitle.trim() || !editPrice) return Alert.alert('Error','Rellena todos los campos');
                try {
                  await apiPost(`/api/deals/${editDeal.id}/edit`,{title:editTitle.trim(),deal_price:parseFloat(editPrice)});
                  setDeals(prev=>prev.map(d=>d.id===editDeal.id?{...d,title:editTitle.trim(),deal_price:parseFloat(editPrice)}:d));
                  setEditDeal(null);
                } catch { Alert.alert('Error','No se pudo guardar'); }
              }}>
              <Text style={{color:'#fff',fontWeight:'700',fontSize:15}}>Guardar cambios</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:{flex:1,backgroundColor:COLORS.bg},
  header:{backgroundColor:COLORS.bg2,borderBottomWidth:0.5,borderBottomColor:COLORS.border},
  headerTop:{flexDirection:'row',justifyContent:'space-between',alignItems:'flex-start',paddingHorizontal:16,paddingTop:14,paddingBottom:10},
  title:{fontSize:22,fontWeight:'700',color:COLORS.text},
  sub:{fontSize:12,color:COLORS.text3,marginTop:1},
  addBtn:{flexDirection:'row',alignItems:'center',gap:4,backgroundColor:COLORS.danger,borderRadius:99,paddingHorizontal:14,paddingVertical:8},
  addBtnTxt:{color:'#fff',fontWeight:'700',fontSize:13},
  sortRow:{flexDirection:'row',paddingHorizontal:12,gap:6,paddingBottom:10},
  sortBtn:{flex:1,paddingVertical:8,borderRadius:10,alignItems:'center',backgroundColor:COLORS.bg3,borderWidth:1,borderColor:COLORS.border},
  sortBtnOn:{backgroundColor:COLORS.danger,borderColor:COLORS.danger},
  sortTxt:{fontSize:13,fontWeight:'500',color:COLORS.text2},
  catBtn:{flexDirection:'row',alignItems:'center',gap:5,paddingHorizontal:12,paddingVertical:6,borderRadius:99,borderWidth:1.5,borderColor:COLORS.border,backgroundColor:COLORS.bg},
  catBtnOn:{backgroundColor:COLORS.danger,borderColor:COLORS.danger},
  catEmoji:{fontSize:13},catTxt:{fontSize:12,color:COLORS.text2},
  guestBanner:{backgroundColor:'#FFF5F5',borderBottomWidth:0.5,borderBottomColor:'#FECACA',paddingHorizontal:16,paddingVertical:9},
  guestTxt:{fontSize:13,color:COLORS.danger,fontWeight:'500',textAlign:'center'},
  card:{backgroundColor:COLORS.bg2,borderRadius:18,overflow:'hidden',borderWidth:0.5,borderColor:COLORS.border,shadowColor:'#000',shadowOffset:{width:0,height:2},shadowOpacity:0.06,shadowRadius:8,elevation:2},
  tempBadge:{alignSelf:'flex-start',paddingHorizontal:10,paddingVertical:4,margin:10,marginBottom:0,borderRadius:99},
  tempTxt:{fontSize:12,fontWeight:'700'},
  img:{width:'100%',height:200,backgroundColor:COLORS.bg3},
  imgPlaceholder:{width:'100%',height:140,alignItems:'center',justifyContent:'center'},
  cardBody:{padding:14},
  metaRow:{flexDirection:'row',alignItems:'center',gap:6,marginBottom:8,flexWrap:'wrap'},
  storeBadge:{backgroundColor:COLORS.primaryLight,borderRadius:6,paddingHorizontal:8,paddingVertical:3},
  storeTxt:{fontSize:11,fontWeight:'700',color:COLORS.primary},
  catTag:{backgroundColor:COLORS.bg3,borderRadius:6,paddingHorizontal:8,paddingVertical:3},
  catTagTxt:{fontSize:11,color:COLORS.text2},
  ageTag:{fontSize:11,color:COLORS.text3,marginLeft:'auto'},
  expiredBtn:{padding:8,borderRadius:8,backgroundColor:COLORS.bg3},
  expireTag:{fontSize:10,color:COLORS.danger,fontWeight:'700',backgroundColor:'#FEF2F2',borderRadius:99,paddingHorizontal:6,paddingVertical:2},
  dealTitle:{fontSize:16,fontWeight:'700',color:COLORS.text,lineHeight:22,marginBottom:10},
  priceRow:{flexDirection:'row',alignItems:'center',gap:8,marginBottom:10},
  dealPrice:{fontSize:22,fontWeight:'800',color:COLORS.danger},
  origPrice:{fontSize:15,color:COLORS.text3,textDecorationLine:'line-through'},
  discBadge:{backgroundColor:'#FEE2E2',borderRadius:8,paddingHorizontal:10,paddingVertical:4,justifyContent:'center'},
  discTxt:{fontSize:15,fontWeight:'900',color:COLORS.danger,letterSpacing:-0.5},
  reporterRow:{flexDirection:'row',alignItems:'center',gap:6},
  reporterAvatar:{width:22,height:22,borderRadius:11,backgroundColor:COLORS.primaryLight,alignItems:'center',justifyContent:'center'},
  reporterName:{fontSize:12,color:COLORS.text3},
  actions:{flexDirection:'row',alignItems:'center',gap:8,paddingHorizontal:14,paddingVertical:12,borderTopWidth:0.5,borderTopColor:COLORS.border},
  voteGroup:{flexDirection:'row',alignItems:'center',borderRadius:99,borderWidth:1.5,borderColor:COLORS.border,overflow:'hidden'},
  voteBtn:{flexDirection:'row',alignItems:'center',gap:4,paddingHorizontal:14,paddingVertical:9},
  voteDivider:{width:1,height:'100%',backgroundColor:COLORS.border},
  voteNum:{fontSize:15,fontWeight:'700'},
  commentBtn:{flexDirection:'row',alignItems:'center',gap:4,padding:8},
  commentCount:{fontSize:13,color:COLORS.text2},
  goBtn:{marginLeft:'auto',flexDirection:'row',alignItems:'center',gap:4,backgroundColor:COLORS.primary,borderRadius:99,paddingHorizontal:16,paddingVertical:10},
  goBtnTxt:{color:'#fff',fontWeight:'700',fontSize:13},
  empty:{alignItems:'center',paddingTop:60,paddingHorizontal:32},
  emptyTitle:{fontSize:18,fontWeight:'700',color:COLORS.text,marginBottom:6},
  emptyDesc:{fontSize:14,color:COLORS.text2,textAlign:'center',lineHeight:21,marginBottom:20},
  emptyBtn:{backgroundColor:COLORS.danger,borderRadius:99,paddingHorizontal:24,paddingVertical:13},
  emptyBtnTxt:{color:'#fff',fontWeight:'700',fontSize:14},
  searchRow:{flexDirection:'row',alignItems:'center',backgroundColor:COLORS.bg3,borderRadius:12,borderWidth:1.5,borderColor:COLORS.border,paddingHorizontal:12,paddingVertical:9,marginHorizontal:12,marginBottom:10},
  searchInput:{flex:1,fontSize:14,color:COLORS.text},
});
