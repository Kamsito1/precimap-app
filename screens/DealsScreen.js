import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Image, ActivityIndicator, RefreshControl, Linking, Alert, TextInput, Modal, Share, ScrollView, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, apiGet, apiPost, apiDelete, timeAgo, applyAffiliateTag, formatPrice, API_BASE, openURL } from '../utils';
import { useAuth } from '../contexts/AuthContext';
import AuthModal from '../components/AuthModal';
import CommentsModal from '../components/CommentsModal';
import AddDealModal from '../components/AddDealModal';
import AdBanner from '../components/AdBanner';

const CARD_W = Dimensions.get('window').width - 24; // card width for carousel

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
  { key:'ocio',         label:'Ocio',          emoji:'🎭' },
  { key:'salud',        label:'Salud',         emoji:'💊' },
  { key:'mascotas',     label:'Mascotas',      emoji:'🐾' },
  { key:'infantil',     label:'Infantil',      emoji:'👶' },
  { key:'otros',        label:'Otros',         emoji:'🏷️' },
];

const SORTS = [
  { key:'hot',   label:'🔥 Top',    desc:'Más votados' },
  { key:'new',   label:'🆕 Nuevo',  desc:'Más recientes' },
  { key:'top',   label:'👑 Mejor',  desc:'Históricamente mejor' },
  { key:'price', label:'💰 Precio', desc:'Más baratos primero' },
];

// SafeImage: maneja onError sin setNativeProps (compatible con Hermes/iOS)
function SafeImage({ uri, fallback, style }) {
  const [src, setSrc] = React.useState(uri && uri.startsWith('http') ? uri : fallback);
  React.useEffect(() => {
    setSrc(uri && uri.startsWith('http') ? uri : fallback);
  }, [uri, fallback]);
  if (!src) return <View style={[style, {backgroundColor:'#f3f4f6'}]}/>;
  return (
    <Image
      source={{ uri: src }}
      style={style}
      resizeMode="cover"
      onError={() => { if (src !== fallback && fallback) setSrc(fallback); }}
    />
  );
}

export default function DealsScreen() {
  const { isLoggedIn, user } = useAuth();
  const [deals, setDeals]         = useState([]);
  const [trending, setTrending]   = useState([]);
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

  // Load trending on mount
  useEffect(() => {
    apiGet('/api/deals/trending').then(t => { if (Array.isArray(t)) setTrending(t); }).catch(()=>{});
  }, []);

  // Load user's persistent votes on mount
  useEffect(() => {
    if (isLoggedIn) {
      apiGet('/api/users/me/votes').then(v => { if (v && typeof v === 'object') setMyVotes(v); }).catch(() => {});
    }
  }, [isLoggedIn]);

  // Debounced search — skip on mount (initial load handled by the effect above)
  const isMounted = useRef(false);
  useEffect(() => {
    if (!isMounted.current) { isMounted.current = true; return; }
    const timer = setTimeout(() => { resetAndLoad(); }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  function resetAndLoad() {
    setOffset(0); setHasMore(true); load(0, true);
  }

  async function load(off = 0, reset = false) {
    if (reset) setLoading(true);
    try {
      let url = `/api/deals?cat=${cat}&sort=${sort}&limit=${PAGE}&offset=${off}`;
      if (search.trim()) url += `&search=${encodeURIComponent(search.trim())}`;
      if (minDiscount > 0) url += `&min_discount=${minDiscount}`;
      const data = await apiGet(url) || [];
      if (reset) setDeals(data);
      else setDeals(prev => [...prev, ...data]);
      setHasMore(data.length === PAGE);
      setOffset(off + data.length);
    } catch(e) {
      // network error — keep existing data
    } finally {
      setLoading(false); setRefreshing(false); setLoadingMore(false);
    }
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
    try { await apiPost(`/api/deals/${dealId}/vote`, { vote: v }); }
    catch(_) { /* revert on error */ setMyVotes(mv => ({ ...mv, [dealId]: prev })); }
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
            {trending.length > 0 && (
              <View style={{flexDirection:'row',alignItems:'center',gap:4,marginTop:2}}>
                <Text style={{fontSize:10,color:COLORS.danger,fontWeight:'700'}}>TENDENCIA:</Text>
                <Text style={{fontSize:10,color:COLORS.text2}} numberOfLines={1}>
                  {trending[0]?.temperature} {(trending[0]?.title || '').substring(0,30)}...
                </Text>
              </View>
            )}
            <Text style={s.sub}>
              {deals.length > 0
                ? (() => {
                    const discs = deals.filter(d => d.discount_percent != null && d.discount_percent > 0).map(d => Number(d.discount_percent));
                    const filterTxt = minDiscount > 0 ? ` · filtro -${minDiscount}%+` : '';
                    const searchTxt = search.trim() ? ` · "${search.trim()}"` : '';
                    const bestDisc = discs.length > 0 ? Math.round(Math.max(...discs) || 0) : 0;
                    return `${deals.length} ofertas${bestDisc > 0 ? ' · mejor -' + bestDisc + '%' : ''}${filterTxt}${searchTxt}`;
                  })()
                : loading ? '⏳ Cargando chollos...' : deals.length > 0 ? `${deals.length} chollos · desliza para ver más` : 'Sin chollos con ese filtro'
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

        {/* Sort tabs — row 1 */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={{paddingHorizontal:12,gap:8,paddingBottom:6}}>
          {SORTS.map(so => (
            <TouchableOpacity key={so.key}
              style={[{paddingHorizontal:16,paddingVertical:9,borderRadius:20,borderWidth:1.5,
                borderColor: sort===so.key ? COLORS.danger : COLORS.border,
                backgroundColor: sort===so.key ? COLORS.danger : COLORS.bg}]}
              onPress={() => setSort(so.key)}>
              <Text style={{fontSize:13,fontWeight:'700',color: sort===so.key ? '#fff' : COLORS.text2}}>{so.label}</Text>
            </TouchableOpacity>
          ))}
          <View style={{width:1,height:1}}/>
        </ScrollView>
        {/* Discount filter — row 2 */}
        <View style={{flexDirection:'row',paddingHorizontal:12,gap:8,paddingBottom:10}}>
          <Text style={{fontSize:12,color:COLORS.text3,alignSelf:'center',marginRight:4}}>Descuento:</Text>
          {[0,20,30,50].map(d => (
            <TouchableOpacity key={d}
              style={{paddingHorizontal:12,paddingVertical:6,borderRadius:16,borderWidth:1.5,
                borderColor: minDiscount===d ? COLORS.danger : COLORS.border,
                backgroundColor: minDiscount===d ? COLORS.danger : COLORS.bg}}
              onPress={() => setMinDiscount(d)}>
              <Text style={{fontSize:12,fontWeight:'700',color: minDiscount===d ? '#fff' : COLORS.text2}}>
                {d===0 ? 'Todos' : `-${d}%+`}
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
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.danger}/>}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.3}
          ListHeaderComponent={trending.length > 0 && sort === 'hot' && cat === 'all' ? (
            <View style={{marginBottom:8}}>
              <Text style={{fontSize:11,fontWeight:'700',color:COLORS.text3,marginBottom:6,letterSpacing:0.5}}>🔥 TENDENCIAS HOY</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}
                nestedScrollEnabled={true}
                contentContainerStyle={{gap:8}}>
                {trending.slice(0,5).map(t=>(
                  <TouchableOpacity key={t.id} style={{backgroundColor:COLORS.bg2,borderRadius:12,padding:10,width:180,borderWidth:1,borderColor:COLORS.border,gap:4}}
                    onPress={()=>t.url && openURL(applyAffiliateTag(t.url))}>
                    <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}>
                      <Text style={{fontSize:9,fontWeight:'800',color:COLORS.danger}}>{t.temperature} TRENDING</Text>
                      <Text style={{fontSize:9,color:COLORS.text3}}>👍{t.votes_up||0}</Text>
                    </View>
                    <Text style={{fontSize:12,fontWeight:'700',color:COLORS.text}} numberOfLines={2}>{t.title}</Text>
                    <View style={{flexDirection:'row',alignItems:'center',gap:4}}>
                      <Text style={{fontSize:14,fontWeight:'800',color:COLORS.primary}}>{t.deal_price != null ? t.deal_price.toFixed(2)+'€' : '—'}</Text>
                      {t.discount_percent != null && t.discount_percent > 0 && <View style={{backgroundColor:'#FEE2E2',borderRadius:4,paddingHorizontal:4}}>
                        <Text style={{fontSize:10,fontWeight:'700',color:COLORS.danger}}>-{Math.round(Number(t.discount_percent)||0)}%</Text>
                      </View>}
                    </View>
                    {t.store && <Text style={{fontSize:9,color:COLORS.text3}}>{t.store}</Text>}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          ) : null}
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
            const catLabel = CATS.find(c=>c.key===deal.category)?.label || deal.category || 'otros';
            const catColor = {tecnologia:'#3B82F6',moda:'#EC4899',hogar:'#F59E0B',alimentacion:'#22C55E',viajes:'#6366F1',juegos:'#8B5CF6',belleza:'#F43F5E',deportes:'#14B8A6',libros:'#78716C',coches:'#64748B',ocio:'#A855F7',salud:'#06B6D4',mascotas:'#F97316',infantil:'#F59E0B',otros:'#94A3B8'}[deal.category] || '#94A3B8';
            return (
              <View style={s.card}>
                {/* Temp badge */}
                <View style={[s.tempBadge, {backgroundColor: temp.color+'20'}]}>
                  <Text style={[s.tempTxt, {color: temp.color}]}>{temp.label}</Text>
                </View>

                {/* Image carousel — supports multiple images */}
                {(() => {
                  const imgs = Array.isArray(deal.images) && deal.images.length > 0
                    ? deal.images
                    : deal.image_url ? [deal.image_url] : [];
                  if (imgs.length === 0) return (
                    <View style={[s.imgPlaceholder, {backgroundColor: catColor+'18'}]}>
                      <Text style={{fontSize:52}}>{catEmoji}</Text>
                      {deal.store && <Text style={{fontSize:13,color:catColor,fontWeight:'700',marginTop:8}}>{deal.store}</Text>}
                    </View>
                  );
                  const fallbackUri = `https://ui-avatars.com/api/?name=${encodeURIComponent(deal.store||deal.category||'?')}&size=400&background=random`;
                  if (imgs.length === 1) return (
                    <TouchableOpacity onPress={() => affUrl && openURL(affUrl)} activeOpacity={0.9}>
                      <SafeImage uri={imgs[0] && imgs[0].startsWith('/') ? `${API_BASE}${imgs[0]}` : (imgs[0]||'')} fallback={fallbackUri} style={s.img}/>
                    </TouchableOpacity>
                  );
                  // Multi-image carousel — nestedScrollEnabled para evitar crash en iOS
                  return (
                    <View style={{position:'relative'}}>
                      <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}
                        nestedScrollEnabled={true}
                        style={{width: CARD_W}} contentContainerStyle={{width: CARD_W * imgs.length}}>
                        {imgs.map((uri,idx) => (
                          <TouchableOpacity key={idx} onPress={() => affUrl && openURL(affUrl)} activeOpacity={0.9}>
                            <SafeImage uri={uri && uri.startsWith('/') ? `${API_BASE}${uri}` : (uri||'')} fallback={fallbackUri} style={[s.img, {width: CARD_W}]}/>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                      <View style={{position:'absolute',bottom:8,left:0,right:0,flexDirection:'row',justifyContent:'center',gap:4}}>
                        {imgs.map((_,idx) => (
                          <View key={idx} style={{width:6,height:6,borderRadius:3,backgroundColor:'rgba(255,255,255,0.9)'}}/>
                        ))}
                      </View>
                      <View style={{position:'absolute',top:8,right:8,backgroundColor:'rgba(0,0,0,0.5)',borderRadius:99,paddingHorizontal:8,paddingVertical:3}}>
                        <Text style={{color:'#fff',fontSize:11,fontWeight:'700'}}>📷 {imgs.length}</Text>
                      </View>
                    </View>
                  );
                })()}

                <View style={s.cardBody}>
                  {/* Store + category + age — compact single line */}
                  <View style={s.metaRow}>
                    {deal.store && <View style={s.storeBadge}><Text style={[s.storeTxt,{maxWidth:90}]} numberOfLines={1}>{deal.store}</Text></View>}
                    <View style={s.catTag}><Text style={s.catTagTxt}>{catEmoji} {catLabel}</Text></View>
                    {(() => {
                      const hoursOld = (Date.now() - new Date(deal.detected_at)) / 3600000;
                      if (hoursOld < 24) return <View style={{backgroundColor:COLORS.success,borderRadius:4,paddingHorizontal:5,paddingVertical:1}}><Text style={{fontSize:9,fontWeight:'700',color:'#fff'}}>NUEVO</Text></View>;
                      return null;
                    })()}
                    {(deal.votes_up||0) >= 20 && <View style={{backgroundColor:'#DC2626',borderRadius:4,paddingHorizontal:5,paddingVertical:1}}><Text style={{fontSize:9,fontWeight:'800',color:'#fff'}}>🔥TOP</Text></View>}
                    <Text style={[s.ageTag,{flex:1,textAlign:'right'}]} numberOfLines={1}>{timeAgo(deal.detected_at)}</Text>
                  </View>

                  {/* Title — max 2 lines */}
                  <Text style={s.dealTitle} numberOfLines={2}>{deal.title}</Text>

                  {/* Price — enhanced layout */}
                  <View style={s.priceRow}>
                    <Text style={s.dealPrice}>{formatPrice(deal.deal_price)}</Text>
                    {deal.original_price && <Text style={s.origPrice}>{formatPrice(deal.original_price)}</Text>}
                    {deal.discount_percent != null && deal.discount_percent >= 5 && (
                      <View style={[s.discBadge,
                        deal.discount_percent >= 50 ? {backgroundColor:'#7C3AED'} :
                        deal.discount_percent >= 30 ? {backgroundColor:'#DC2626'} :
                        {backgroundColor:'#FEE2E2'}
                      ]}>
                        <Text style={[s.discTxt, deal.discount_percent >= 30 && {color:'#fff'}]}>-{Math.round(Number(deal.discount_percent)||0)}%</Text>
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
                        ? <SafeImage uri={deal.users.avatar_url} fallback={null} style={{width:18,height:18,borderRadius:9}}/>
                        : <Text style={{fontSize:10,color:COLORS.primary,fontWeight:'700'}}>{(deal.users?.name||'?')[0]}</Text>
                      }
                    </View>
                    <Text style={s.reporterName}>por {deal.users?.name || 'Anónimo'}</Text>
                    {deal.expires_at && (() => {
                      const d2 = Math.ceil((new Date(deal.expires_at) - Date.now()) / 86400000);
                      if (d2 > 0 && d2 <= 3) return <Text style={s.expireTag}>⏰ {d2}d</Text>;
                      return null;
                    })()}
                  </View>
                </View>

                {/* CTA principal — Ver oferta (arriba del actions, ocupa todo el ancho) */}
                {affUrl && (
                  <TouchableOpacity style={s.goBtnFull} onPress={() => openURL(affUrl)}>
                    <Text style={s.goBtnTxt}>Ver oferta</Text>
                    <Ionicons name="open-outline" size={14} color="#fff"/>
                  </TouchableOpacity>
                )}

                {/* Actions — voto + comentar + share + expirar. Sin texto largo, todo icono+número */}
                <View style={s.actions}>
                  {/* Voto caliente / frío */}
                  <View style={s.voteGroup}>
                    <TouchableOpacity
                      style={[s.voteBtn, myVotes[deal.id]===1 && {backgroundColor:'#FEE2E2'}]}
                      onPress={() => vote(deal.id, 1)}>
                      <Ionicons name={myVotes[deal.id]===1 ? "flame" : "flame-outline"} size={18} color={COLORS.danger}/>
                      <Text style={[s.voteNum, {color:COLORS.danger}]}>{deal.votes_up||0}</Text>
                    </TouchableOpacity>
                    <View style={s.voteDivider}/>
                    <TouchableOpacity
                      style={[s.voteBtn, myVotes[deal.id]===-1 && {backgroundColor:'#EFF6FF'}]}
                      onPress={() => vote(deal.id, -1)}>
                      <Ionicons name={myVotes[deal.id]===-1 ? "snow" : "snow-outline"} size={18} color={COLORS.primary}/>
                      <Text style={[s.voteNum, {color:COLORS.primary}]}>{deal.votes_down||0}</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Separador flexible */}
                  <View style={{flex:1}}/>

                  {/* Comentarios */}
                  <TouchableOpacity style={s.iconBtn} onPress={() => setCommentsFor(deal)}>
                    <Ionicons name="chatbubble-outline" size={18} color={COLORS.text2}/>
                    {(deal.comment_count||0) > 0 && <Text style={s.iconBtnTxt}>{deal.comment_count}</Text>}
                  </TouchableOpacity>

                  {/* Compartir */}
                  <TouchableOpacity style={s.iconBtn} onPress={async () => {
                    const text = `🔥 ${deal.title||''}\n💰 ${formatPrice(deal.deal_price)}${deal.discount_percent != null && deal.discount_percent > 0 ?` (-${Math.round(Number(deal.discount_percent)||0)}%)`:''}${deal.url?'\n🔗 '+applyAffiliateTag(deal.url):''}\n\nVía PreciMap`;
                    try {
                      if (typeof navigator !== 'undefined' && navigator.share) {
                        await navigator.share({ title: deal.title, text, url: deal.url || '' });
                      } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
                        await navigator.clipboard.writeText(text);
                        Alert.alert('✅ Copiado', 'Enlace copiado al portapapeles');
                      } else {
                        await Share.share({ message: text });
                      }
                    } catch(_) {}
                  }}>
                    <Ionicons name="share-outline" size={18} color={COLORS.text2}/>
                  </TouchableOpacity>

                  {/* Editar (propietario/admin) */}
                  {isLoggedIn && (deal.reported_by === user?.id || user?.is_admin) && (
                    <TouchableOpacity style={s.iconBtn} onPress={() => {
                      setEditDeal(deal);
                      setEditPrice(String(deal.deal_price||''));
                      setEditTitle(deal.title||'');
                    }}>
                      <Ionicons name="pencil-outline" size={16} color={COLORS.primary}/>
                    </TouchableOpacity>
                  )}

                  {/* Reportar expirado / Admin borrar */}
                  {isLoggedIn && (
                    <TouchableOpacity style={s.iconBtn} onPress={async () => {
                      if (user?.is_admin) {
                        Alert.alert('🛡️ Eliminar', '¿Eliminar este chollo?', [
                          {text:'Cancelar',style:'cancel'},
                          {text:'Eliminar',style:'destructive', onPress: async () => {
                            try { await apiDelete(`/api/deals/${deal.id}`); setDeals(prev => prev.filter(d => d.id !== deal.id)); } catch(_) {}
                          }},
                        ]);
                      } else if (deal.reported_by === user?.id) {
                        Alert.alert('Tu chollo', '¿Retirar tu oferta?', [
                          {text:'Cancelar',style:'cancel'},
                          {text:'Retirar',style:'destructive', onPress: async () => {
                            try { await apiDelete(`/api/deals/${deal.id}`); setDeals(prev => prev.filter(d => d.id !== deal.id)); } catch(_) {}
                          }},
                        ]);
                      } else {
                        Alert.alert('⏰ ¿Ya expiró?',
                          `${deal.expire_reports||0}/5 votos. Con 5 votos se retira automáticamente.`,
                          [
                            {text:'Sí, ya expiró', onPress: async () => {
                              try {
                                const res = await apiPost(`/api/deals/${deal.id}/report-expired`, {});
                                if (res.ok) {
                                  if (res.deactivated) {
                                    setDeals(prev => prev.filter(d => d.id !== deal.id));
                                  } else {
                                    setDeals(prev => prev.map(d => d.id===deal.id ? {...d,expire_reports:res.expire_reports} : d));
                                    Alert.alert('Gracias',`Voto registrado (${res.expire_reports}/5)`);
                                  }
                                }
                              } catch(_) {}
                            }},
                            {text:'Cancelar', style:'cancel'},
                          ]
                        );
                      }
                    }}>
                      <View style={{position:'relative'}}>
                        <Ionicons name={user?.is_admin ? 'shield' : 'alert-circle-outline'} size={16} color={user?.is_admin?'#DC2626':COLORS.text3}/>
                        {(deal.expire_reports||0)>0 && !user?.is_admin && (
                          <View style={{position:'absolute',top:-4,right:-6,backgroundColor:COLORS.danger,borderRadius:99,width:12,height:12,alignItems:'center',justifyContent:'center'}}>
                            <Text style={{fontSize:7,color:'#fff',fontWeight:'800'}}>{deal.expire_reports}</Text>
                          </View>
                        )}
                      </View>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          }}
          ListEmptyComponent={loading ? null :
            <View style={s.empty}>
              {!search && minDiscount === 0 && cat === 'all' ? (
                // Estado vacío principal — invita a publicar
                <>
                  <Text style={{fontSize:60,textAlign:'center',marginBottom:8}}>🔥</Text>
                  <Text style={s.emptyTitle}>¡Sé el primero en publicar un chollo!</Text>
                  <Text style={s.emptyDesc}>
                    Esta comunidad vive de los mejores deals de España. Comparte una oferta increíble y ayuda a que todos ahorren.
                  </Text>
                  {/* Explicación de referido */}
                  <View style={{backgroundColor:'#F0FDF4',borderRadius:14,padding:14,marginVertical:14,borderWidth:1,borderColor:'#86EFAC',width:'100%'}}>
                    <Text style={{fontSize:15,fontWeight:'700',color:'#15803D',marginBottom:6}}>💸 ¿Tienes un enlace de referido?</Text>
                    <Text style={{fontSize:13,color:'#166534',lineHeight:19}}>
                      Si tienes referidos de Amazon, Zara, MediaMarkt u otras tiendas, publícalos aquí. Cada vez que alguien compre desde tu chollo, {'\n'}
                      <Text style={{fontWeight:'700'}}>tú ganas comisión directamente.</Text>
                    </Text>
                  </View>
                  <TouchableOpacity style={s.emptyBtn} onPress={() => isLoggedIn ? setShowAdd(true) : setShowAuth(true)}>
                    <Text style={s.emptyBtnTxt}>🔥 Publicar mi primer chollo</Text>
                  </TouchableOpacity>
                  <Text style={{fontSize:11,color:COLORS.text3,marginTop:10,textAlign:'center'}}>
                    Amazon · El Corte Inglés · Zara · MediaMarkt · AliExpress · y más
                  </Text>
                </>
              ) : (
                <>
                  <Text style={{fontSize:52,textAlign:'center',marginBottom:12}}>
                    {search ? '🔍' : minDiscount > 0 ? '🎯' : '🛍️'}
                  </Text>
                  <Text style={s.emptyTitle}>
                    {search ? `Sin resultados para "${search}"` 
                      : minDiscount > 0 ? `Sin chollos con ≥${minDiscount}% descuento`
                      : 'Sin chollos en esta categoría'}
                  </Text>
                  <Text style={s.emptyDesc}>
                    {search ? 'Prueba con otro término o borra la búsqueda.'
                      : minDiscount > 0 ? 'Prueba con un umbral de descuento menor.'
                      : 'Sé el primero en publicar una oferta en esta categoría.'}
                  </Text>
                  {!search && (
                    <TouchableOpacity style={s.emptyBtn} onPress={() => isLoggedIn ? setShowAdd(true) : setShowAuth(true)}>
                      <Text style={s.emptyBtnTxt}>Publicar chollo</Text>
                    </TouchableOpacity>
                  )}
                </>
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
                } catch(_) { Alert.alert('Error','No se pudo guardar'); }
              }}>
              <Text style={{color:'#fff',fontWeight:'700',fontSize:15}}>Guardar cambios</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <AdBanner screen="deals"/>

      {/* FAB — Publicar chollo */}
      <TouchableOpacity
        style={s.fab}
        onPress={() => isLoggedIn ? setShowAdd(true) : setShowAuth(true)}
        activeOpacity={0.85}>
        <Ionicons name="add" size={28} color="#fff"/>
        <Text style={s.fabTxt}>Chollo</Text>
      </TouchableOpacity>

    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:{flex:1,backgroundColor:COLORS.bg},
  header:{backgroundColor:COLORS.bg2,borderBottomWidth:0.5,borderBottomColor:COLORS.border},
  headerTop:{flexDirection:'row',justifyContent:'space-between',alignItems:'flex-start',paddingHorizontal:16,paddingTop:14,paddingBottom:10},
  title:{fontSize:22,fontWeight:'700',color:COLORS.text},
  sub:{fontSize:12,color:COLORS.text3,marginTop:1},
  fab:{position:'absolute',bottom:80,right:16,backgroundColor:COLORS.danger,borderRadius:28,paddingHorizontal:18,paddingVertical:14,flexDirection:'row',alignItems:'center',gap:6,shadowColor:COLORS.danger,shadowOpacity:0.45,shadowRadius:12,shadowOffset:{width:0,height:4},elevation:8},
  fabTxt:{color:'#fff',fontWeight:'800',fontSize:14},
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
  card:{backgroundColor:COLORS.bg2,borderRadius:16,overflow:'hidden',borderWidth:0.5,borderColor:COLORS.border,shadowColor:'#000',shadowOffset:{width:0,height:2},shadowOpacity:0.06,shadowRadius:8,elevation:2},
  tempBadge:{alignSelf:'flex-start',paddingHorizontal:8,paddingVertical:3,margin:8,marginBottom:0,borderRadius:99},
  tempTxt:{fontSize:11,fontWeight:'700'},
  img:{width:'100%',height:180,backgroundColor:COLORS.bg3},
  imgPlaceholder:{width:'100%',height:120,alignItems:'center',justifyContent:'center'},
  cardBody:{padding:12},
  metaRow:{flexDirection:'row',alignItems:'center',gap:4,marginBottom:6,flexWrap:'nowrap',overflow:'hidden'},
  storeBadge:{backgroundColor:COLORS.primaryLight,borderRadius:4,paddingHorizontal:6,paddingVertical:2},
  storeTxt:{fontSize:10,fontWeight:'700',color:COLORS.primary},
  catTag:{backgroundColor:COLORS.bg3,borderRadius:4,paddingHorizontal:6,paddingVertical:2},
  catTagTxt:{fontSize:10,color:COLORS.text2},
  ageTag:{fontSize:10,color:COLORS.text3},
  expiredBtn:{padding:6,borderRadius:6,backgroundColor:COLORS.bg3},
  expireTag:{fontSize:9,color:COLORS.danger,fontWeight:'700',backgroundColor:'#FEF2F2',borderRadius:99,paddingHorizontal:5,paddingVertical:1},
  dealTitle:{fontSize:14,fontWeight:'700',color:COLORS.text,lineHeight:20,marginBottom:6},
  priceRow:{flexDirection:'row',alignItems:'center',gap:6,marginBottom:8},
  dealPrice:{fontSize:20,fontWeight:'800',color:COLORS.danger},
  origPrice:{fontSize:13,color:COLORS.text3,textDecorationLine:'line-through'},
  discBadge:{backgroundColor:'#FEE2E2',borderRadius:6,paddingHorizontal:7,paddingVertical:3,justifyContent:'center'},
  discTxt:{fontSize:13,fontWeight:'900',color:COLORS.danger,letterSpacing:-0.5},
  reporterRow:{flexDirection:'row',alignItems:'center',gap:6},
  reporterAvatar:{width:18,height:18,borderRadius:9,backgroundColor:COLORS.primaryLight,alignItems:'center',justifyContent:'center'},
  reporterName:{fontSize:11,color:COLORS.text3},
  // Actions — single row, 4 icon buttons max + votes pill
  actions:{flexDirection:'row',alignItems:'center',gap:2,paddingHorizontal:12,paddingVertical:8,borderTopWidth:0.5,borderTopColor:COLORS.border},
  voteGroup:{flexDirection:'row',alignItems:'center',borderRadius:99,borderWidth:1,borderColor:COLORS.border,overflow:'hidden'},
  voteBtn:{flexDirection:'row',alignItems:'center',gap:3,paddingHorizontal:10,paddingVertical:7},
  voteDivider:{width:0.5,height:22,backgroundColor:COLORS.border},
  voteNum:{fontSize:13,fontWeight:'700'},
  iconBtn:{padding:8,borderRadius:8},
  iconBtnTxt:{fontSize:11,color:COLORS.text2,fontWeight:'600'},
  goBtnFull:{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:6,backgroundColor:COLORS.primary,borderRadius:10,paddingVertical:10,marginHorizontal:12,marginBottom:0},
  goBtn:{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:4,backgroundColor:COLORS.primary,borderRadius:99,paddingHorizontal:10,paddingVertical:7},
  goBtnTxt:{color:'#fff',fontWeight:'700',fontSize:13},
  empty:{alignItems:'center',paddingTop:60,paddingHorizontal:32},
  emptyTitle:{fontSize:18,fontWeight:'700',color:COLORS.text,marginBottom:6},
  emptyDesc:{fontSize:14,color:COLORS.text2,textAlign:'center',lineHeight:21,marginBottom:20},
  emptyBtn:{backgroundColor:COLORS.danger,borderRadius:99,paddingHorizontal:24,paddingVertical:13},
  emptyBtnTxt:{color:'#fff',fontWeight:'700',fontSize:14},
  searchRow:{flexDirection:'row',alignItems:'center',backgroundColor:COLORS.bg3,borderRadius:12,borderWidth:1.5,borderColor:COLORS.border,paddingHorizontal:12,paddingVertical:9,marginHorizontal:12,marginBottom:10},
  searchInput:{flex:1,fontSize:14,color:COLORS.text},
});
