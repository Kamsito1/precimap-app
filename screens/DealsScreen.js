import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList, Modal, ScrollView,
  ActivityIndicator, RefreshControl, Alert, Image, TextInput, Linking,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, apiGet, apiPost, apiPatch, apiDelete, timeAgo, openURL, fmtP } from '../utils';
import { useAuth } from '../contexts/AuthContext';
import * as ImagePicker from 'expo-image-picker';
import AuthModal from '../components/AuthModal';
import AddDealModal from '../components/AddDealModal';
import CommentsModal from '../components/CommentsModal';

const DEAL_CATEGORIES = [
  { key:'todos', label:'Todos', icon:'grid-outline' },
  { key:'tecnologia', label:'Tecnología', icon:'laptop-outline' },
  { key:'hogar', label:'Hogar', icon:'home-outline' },
  { key:'moda', label:'Moda', icon:'shirt-outline' },
  { key:'alimentacion', label:'Alimentación', icon:'nutrition-outline' },
  { key:'ocio', label:'Ocio', icon:'game-controller-outline' },
  { key:'viajes', label:'Viajes', icon:'airplane-outline' },
  { key:'servicios', label:'Servicios', icon:'construct-outline' },
  { key:'otros', label:'Otros', icon:'ellipsis-horizontal-outline' },
];

const FILTER_OPTS = [
  { key:'nuevos', label:'Nuevos', icon:'time-outline' },
  { key:'destacados', label:'Destacados', icon:'flame-outline' },
  { key:'gratis', label:'Gratis', icon:'gift-outline' },
];

const TIME_FILTERS = [
  { key:'1d', label:'Hoy' },
  { key:'7d', label:'Semana' },
  { key:'30d', label:'Mes' },
  { key:'365d', label:'Año' },
  { key:'all', label:'Todos' },
];

export default function DealsScreen() {
  const { isLoggedIn, user } = useAuth();
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDeal, setSelectedDeal] = useState(null);
  const [commentsDeal, setCommentsDeal] = useState(null);
  const [editDeal, setEditDeal] = useState(null);
  const [activeCategory, setActiveCategory] = useState('todos');
  const [activeFilter, setActiveFilter] = useState('nuevos');
  const [timeFilter, setTimeFilter] = useState('all');
  const [userVotes, setUserVotes] = useState({});
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [showWelcome, setShowWelcome] = useState(false);
  const flatListRef = useRef(null);

  useEffect(() => { loadDeals(true); loadVotes(); checkWelcome(); }, []);
  useEffect(() => { loadDeals(true); }, [activeCategory, activeFilter, timeFilter]);

  async function checkWelcome() {
    try {
      const { default: AsyncStorage } = await import('@react-native-async-storage/async-storage');
      const seen = await AsyncStorage.getItem('deals_welcome_seen');
      if (!seen) { setShowWelcome(true); AsyncStorage.setItem('deals_welcome_seen','1'); }
    } catch(_) {}
  }

  async function loadVotes() {
    if (!isLoggedIn) return;
    try { const v = await apiGet('/api/users/me/votes'); setUserVotes(v||{}); } catch(_) {}
  }

  async function loadDeals(reset=false) {
    if (reset) { setPage(0); setLoading(true); }
    try {
      const p = reset ? 0 : page;
      let url = `/api/deals?offset=${p*20}&limit=20&sort=votes`;
      if (activeCategory !== 'todos') url += `&category=${activeCategory}`;
      if (activeFilter === 'gratis') url += `&max_price=0`;
      if (activeFilter === 'nuevos') url = url.replace('sort=votes','sort=new');
      if (timeFilter !== 'all') url += `&since=${timeFilter}`;
      if (searchQuery.trim()) url += `&search=${encodeURIComponent(searchQuery.trim())}`;
      const data = await apiGet(url) || [];
      if (reset) setDeals(data);
      else setDeals(prev => [...prev, ...data]);
      setHasMore(data.length >= 20);
      setPage(reset ? 1 : p + 1);
    } catch(_) {} finally { setLoading(false); setRefreshing(false); }
  }

  async function voteDeal(dealId, vote) {
    if (!isLoggedIn) { setShowAuth(true); return; }
    try {
      await apiPost(`/api/deals/${dealId}/vote`, { vote });
      setUserVotes(prev => ({ ...prev, [dealId]: vote }));
      setDeals(prev => prev.map(d => {
        if (d.id !== dealId) return d;
        const oldVote = userVotes[dealId];
        let up = d.votes_up || 0, down = d.votes_down || 0;
        if (oldVote === 'up') up--; if (oldVote === 'down') down--;
        if (vote === 'up') up++; if (vote === 'down') down++;
        return { ...d, votes_up: up, votes_down: down };
      }));
    } catch(_) {}
  }

  async function reportScam(dealId) {
    if (!isLoggedIn) { setShowAuth(true); return; }
    Alert.alert('Reportar timo','¿Estás seguro de que este chollo es falso o engañoso?',[
      {text:'Cancelar',style:'cancel'},
      {text:'Reportar',style:'destructive',onPress:async()=>{
        try { await apiPost(`/api/deals/${dealId}/report-scam`); Alert.alert('Reportado','Gracias por avisar. Lo revisaremos.'); } catch(_) {}
      }},
    ]);
  }

  async function reportExpired(dealId) {
    if (!isLoggedIn) { setShowAuth(true); return; }
    Alert.alert('Oferta agotada','¿Se ha agotado o expirado esta oferta?',[
      {text:'Cancelar',style:'cancel'},
      {text:'Sí, se ha agotado',onPress:async()=>{
        try { await apiPost(`/api/deals/${dealId}/report-expired`); Alert.alert('Reportado','Gracias. Lo revisaremos y lo retiraremos si se confirma.'); } catch(_) {}
      }},
    ]);
  }

  const onRefresh = useCallback(()=>{ setRefreshing(true); loadDeals(true); loadVotes(); },[activeCategory,activeFilter]);

  const filteredDeals = searchQuery.trim()
    ? deals.filter(d=>(d.title||'').toLowerCase().includes(searchQuery.toLowerCase()))
    : deals;

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <View style={s.headerRow}>
          <View style={{flexDirection:'row',alignItems:'center',gap:6}}>
            <Ionicons name="flame" size={20} color="#DC2626"/>
            <Text style={s.logo}>Chollos</Text>
          </View>
          <View style={{flexDirection:'row',alignItems:'center',gap:8}}>
            <TouchableOpacity style={s.headerBtn} onPress={()=>setShowSearch(!showSearch)}>
              <Ionicons name={showSearch?'close':'search-outline'} size={20} color={COLORS.text2}/>
            </TouchableOpacity>
            <TouchableOpacity style={s.headerBtn} onPress={()=>setShowSettings(true)}>
              <Ionicons name="options-outline" size={20} color={COLORS.text2}/>
            </TouchableOpacity>
          </View>
        </View>
        {/* Search bar */}
        {showSearch && (
          <View style={{flexDirection:'row',alignItems:'center',marginHorizontal:14,marginBottom:8,backgroundColor:COLORS.bg3,borderRadius:10,paddingHorizontal:10,gap:6,borderWidth:1,borderColor:COLORS.border}}>
            <Ionicons name="search-outline" size={16} color={COLORS.text3}/>
            <TextInput style={{flex:1,paddingVertical:8,fontSize:14,color:COLORS.text}}
              value={searchQuery} onChangeText={t=>{setSearchQuery(t);}} placeholder="Buscar chollos..."
              placeholderTextColor={COLORS.text3} returnKeyType="search" onSubmitEditing={()=>loadDeals(true)} autoFocus/>
            {searchQuery?<TouchableOpacity onPress={()=>{setSearchQuery('');loadDeals(true);}}><Ionicons name="close-circle" size={16} color={COLORS.text3}/></TouchableOpacity>:null}
          </View>
        )}

        {/* Filter pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{paddingHorizontal:14,gap:6,paddingBottom:8}}>
          {FILTER_OPTS.map(f=>(
            <TouchableOpacity key={f.key} style={[s.pill,activeFilter===f.key&&s.pillOn]} onPress={()=>setActiveFilter(f.key)}>
              <Ionicons name={f.icon} size={13} color={activeFilter===f.key?'#fff':COLORS.text2}/>
              <Text style={[s.pillTxt,activeFilter===f.key&&{color:'#fff'}]}>{f.label}</Text>
            </TouchableOpacity>
          ))}
          <View style={{width:1,backgroundColor:COLORS.border,marginHorizontal:4}}/>
          {TIME_FILTERS.map(t=>(
            <TouchableOpacity key={t.key} style={[s.pill,timeFilter===t.key&&{backgroundColor:COLORS.bg3,borderColor:COLORS.primary}]}
              onPress={()=>setTimeFilter(t.key)}>
              <Text style={[s.pillTxt,timeFilter===t.key&&{color:COLORS.primary}]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Settings Modal */}
      <Modal visible={showSettings} animationType="fade" transparent onRequestClose={()=>setShowSettings(false)}>
        <TouchableOpacity style={{flex:1,backgroundColor:'rgba(0,0,0,0.4)'}} activeOpacity={1} onPress={()=>setShowSettings(false)}>
          <View style={{position:'absolute',top:100,right:16,backgroundColor:COLORS.bg2,borderRadius:18,padding:16,width:280,
            shadowColor:'#000',shadowOpacity:0.2,shadowRadius:20,elevation:10,borderWidth:1,borderColor:COLORS.border}}>
            <TouchableOpacity activeOpacity={1} onPress={e=>e.stopPropagation()}>
              <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
                <Text style={{fontSize:16,fontWeight:'700',color:COLORS.text}}>Filtrar por categoría</Text>
                <TouchableOpacity onPress={()=>setShowSettings(false)} style={{width:30,height:30,borderRadius:15,backgroundColor:COLORS.bg3,alignItems:'center',justifyContent:'center'}}>
                  <Ionicons name="close" size={18} color={COLORS.text2}/>
                </TouchableOpacity>
              </View>
              <View style={{gap:4}}>
                {DEAL_CATEGORIES.map(c=>(
                  <TouchableOpacity key={c.key} style={{flexDirection:'row',alignItems:'center',gap:8,paddingVertical:8,paddingHorizontal:8,borderRadius:10,
                    backgroundColor:activeCategory===c.key?COLORS.primaryLight:'transparent'}}
                    onPress={()=>{setActiveCategory(c.key);setShowSettings(false);}}>
                    <Ionicons name={c.icon} size={16} color={activeCategory===c.key?COLORS.primary:COLORS.text2}/>
                    <Text style={{flex:1,fontSize:13,fontWeight:'600',color:activeCategory===c.key?COLORS.primary:COLORS.text}}>{c.label}</Text>
                    {activeCategory===c.key&&<Ionicons name="checkmark-circle" size={16} color={COLORS.primary}/>}
                  </TouchableOpacity>
                ))}
              </View>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Welcome popup */}
      <Modal visible={showWelcome} animationType="fade" transparent onRequestClose={()=>setShowWelcome(false)}>
        <View style={{flex:1,backgroundColor:'rgba(0,0,0,0.5)',justifyContent:'center',alignItems:'center',padding:24}}>
          <View style={{backgroundColor:COLORS.bg2,borderRadius:20,padding:24,width:'100%',maxWidth:340,alignItems:'center'}}>
            <View style={{width:60,height:60,borderRadius:30,backgroundColor:'#FEF2F2',alignItems:'center',justifyContent:'center',marginBottom:16}}>
              <Ionicons name="flame" size={32} color="#DC2626"/>
            </View>
            <Text style={{fontSize:20,fontWeight:'800',color:COLORS.text,textAlign:'center',marginBottom:8}}>Chollos de la comunidad</Text>
            <Text style={{fontSize:14,color:COLORS.text2,textAlign:'center',lineHeight:20,marginBottom:16}}>
              Comparte ofertas que encuentres y gana dinero con tus enlaces de referido. Cuantos más votos reciba tu chollo, más visible será.
            </Text>
            <View style={{flexDirection:'row',gap:12,width:'100%'}}>
              <View style={{flex:1,alignItems:'center',padding:10,backgroundColor:COLORS.bg3,borderRadius:12}}>
                <Ionicons name="link-outline" size={20} color={COLORS.primary}/>
                <Text style={{fontSize:11,color:COLORS.text2,marginTop:4,textAlign:'center'}}>Comparte tu enlace</Text>
              </View>
              <View style={{flex:1,alignItems:'center',padding:10,backgroundColor:COLORS.bg3,borderRadius:12}}>
                <Ionicons name="flame-outline" size={20} color="#DC2626"/>
                <Text style={{fontSize:11,color:COLORS.text2,marginTop:4,textAlign:'center'}}>La comunidad vota</Text>
              </View>
              <View style={{flex:1,alignItems:'center',padding:10,backgroundColor:COLORS.bg3,borderRadius:12}}>
                <Ionicons name="cash-outline" size={20} color={COLORS.success}/>
                <Text style={{fontSize:11,color:COLORS.text2,marginTop:4,textAlign:'center'}}>Ganas con referidos</Text>
              </View>
            </View>
            <TouchableOpacity style={{backgroundColor:COLORS.primary,borderRadius:14,paddingVertical:14,width:'100%',alignItems:'center',marginTop:16}}
              onPress={()=>setShowWelcome(false)}>
              <Text style={{color:'#fff',fontWeight:'700',fontSize:15}}>Entendido</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Deal list */}
      <FlatList
        ref={flatListRef}
        data={filteredDeals}
        keyExtractor={d=>`deal_${d.id}`}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary}/>}
        contentContainerStyle={{padding:12,gap:10,paddingBottom:80}}
        onEndReached={()=>{ if(hasMore&&!loading) loadDeals(); }}
        onEndReachedThreshold={0.3}
        renderItem={({item:d})=>{
          const myVote = userVotes[d.id];
          const votes = (d.votes_up||0)-(d.votes_down||0);
          const disc = d.discount_percent ? Math.round(d.discount_percent) : null;
          return (
            <View style={s.card}>
              <TouchableOpacity activeOpacity={0.85} onPress={()=>setSelectedDeal(d)}>
              <View style={{flexDirection:'row',gap:12}}>
                {/* Image */}
                <View style={s.cardImg}>
                  {d.image_url ? (
                    <Image source={{uri:d.image_url.startsWith('http')?d.image_url:`https://web-production-a8023.up.railway.app${d.image_url}`}}
                      style={{width:'100%',height:'100%',borderRadius:10}} resizeMode="cover"/>
                  ) : (
                    <Ionicons name="image-outline" size={30} color={COLORS.text3}/>
                  )}
                  {disc && (
                    <View style={s.discBadge}>
                      <Text style={s.discTxt}>-{disc}%</Text>
                    </View>
                  )}
                </View>

                {/* Info */}
                <View style={{flex:1,justifyContent:'space-between'}}>
                  {d.store && <Text style={{fontSize:11,fontWeight:'600',color:COLORS.primary}} numberOfLines={1}>{d.store}</Text>}
                  <Text style={s.cardTitle} numberOfLines={2}>{d.title}</Text>
                  <View style={{flexDirection:'row',alignItems:'baseline',gap:6,marginTop:4}}>
                    <Text style={s.cardPrice}>{d.deal_price===0?'GRATIS':`${d.deal_price?.toFixed(2).replace(".",",")}€`}</Text>
                    {d.original_price>0 && <Text style={s.cardOldPrice}>{d.original_price?.toFixed(2).replace(".",",")}€</Text>}
                  </View>
                </View>
              </View>
              </TouchableOpacity>
              <View style={{flexDirection:'row',alignItems:'center',gap:10,marginTop:8,paddingTop:8,borderTopWidth:0.5,borderTopColor:COLORS.border}}>
                <TouchableOpacity style={[s.voteBtn,myVote==='up'&&{backgroundColor:'#FEE2E2'}]}
                  onPress={()=>voteDeal(d.id,myVote==='up'?'none':'up')}>
                  <Ionicons name={myVote==='up'?'flame':'flame-outline'} size={16} color={myVote==='up'?'#DC2626':COLORS.text3}/>
                  <Text style={[s.voteTxt,myVote==='up'&&{color:'#DC2626'}]}>{d.votes_up||0}</Text>
                </TouchableOpacity>
                <Text style={{fontSize:12,fontWeight:'700',color:votes>0?COLORS.success:votes<0?COLORS.danger:COLORS.text3}}>
                  {votes>0?'+':''}{votes}
                </Text>
                <TouchableOpacity style={[s.voteBtn,myVote==='down'&&{backgroundColor:'#DBEAFE'}]}
                  onPress={()=>voteDeal(d.id,myVote==='down'?'none':'down')}>
                  <Ionicons name={myVote==='down'?'snow':'snow-outline'} size={14} color={myVote==='down'?'#2563EB':COLORS.text3}/>
                </TouchableOpacity>
                <View style={{flex:1}}/>
                {d.url && (
                  <TouchableOpacity style={s.goBtn} onPress={()=>openURL(d.url)}>
                    <Text style={s.goTxt}>Ir al chollo</Text>
                    <Ionicons name="open-outline" size={12} color="#fff"/>
                  </TouchableOpacity>
                )}
              </View>
              <Text style={{fontSize:10,color:COLORS.text3,marginTop:4,paddingLeft:2}}>{timeAgo(d.created_at)}</Text>
            </View>
          );
        }}

        ListEmptyComponent={
          loading ? <ActivityIndicator color={COLORS.primary} style={{marginTop:40}}/> : (
            <View style={{alignItems:'center',paddingTop:50,gap:8}}>
              <Ionicons name="flame-outline" size={40} color={COLORS.text3}/>
              <Text style={{fontSize:16,fontWeight:'700',color:COLORS.text}}>No hay chollos todavía</Text>
              <Text style={{fontSize:13,color:COLORS.text3,textAlign:'center',paddingHorizontal:30}}>
                Sé el primero en compartir una oferta. Pulsa + para publicar un chollo.
              </Text>
            </View>
          )
        }
        ListFooterComponent={hasMore&&deals.length>0?<ActivityIndicator color={COLORS.primary} style={{paddingVertical:20}}/>:null}
      />

      {/* FAB — add deal */}
      <TouchableOpacity style={s.fab} onPress={()=>{
        if(!isLoggedIn){setShowAuth(true);return;}
        setShowAdd(true);
      }}>
        <Ionicons name="add" size={28} color="#fff"/>
      </TouchableOpacity>

      {/* Deal detail modal */}
      <Modal visible={!!selectedDeal} animationType="slide" presentationStyle="pageSheet" onRequestClose={()=>setSelectedDeal(null)}>
        {selectedDeal && <DealDetail deal={selectedDeal} onClose={()=>setSelectedDeal(null)}
          userVote={userVotes[selectedDeal.id]} onVote={voteDeal} onReport={reportScam} onReportExpired={reportExpired}
          onComments={()=>{setCommentsDeal(selectedDeal);setSelectedDeal(null);}} isLoggedIn={isLoggedIn} onAuth={()=>setShowAuth(true)}
          isAdmin={user?.is_admin} userId={user?.id} onDelete={async(id)=>{
            try{await apiDelete(`/api/deals/${id}/admin`);setSelectedDeal(null);loadDeals();}catch(_){Alert.alert('Error','No se pudo eliminar');}
          }} onEdit={()=>{setEditDeal(selectedDeal);setSelectedDeal(null);}}/>}
      </Modal>

      {/* Comments modal */}
      <CommentsModal visible={!!commentsDeal} dealId={commentsDeal?.id} onClose={()=>setCommentsDeal(null)}/>
      <EditDealModal visible={!!editDeal} deal={editDeal} onClose={()=>setEditDeal(null)}
        onSave={async(id,data)=>{
          try{const r=await apiPatch(`/api/deals/${id}`,data);if(r?.error){Alert.alert('Error',r.error);}else{setEditDeal(null);loadDeals();}}catch(e){Alert.alert('Error',e.message||'Error desconocido');}
        }}/>

      {/* Add deal modal */}
      <AddDealModal visible={showAdd} onClose={()=>setShowAdd(false)}
        onSuccess={()=>{setShowAdd(false);loadDeals(true);}}/>

      <AuthModal visible={showAuth} onClose={()=>setShowAuth(false)}/>
    </SafeAreaView>
  );
}

// === DEAL DETAIL ===
function DealDetail({ deal, onClose, userVote, onVote, onReport, onReportExpired, onComments, isLoggedIn, onAuth, isAdmin, onDelete, userId, onEdit }) {
  const d = deal;
  const votes = (d.votes_up||0)-(d.votes_down||0);
  const disc = d.discount_percent ? Math.round(d.discount_percent) : null;
  const images = Array.isArray(d.images) && d.images.length > 0 ? d.images : (d.image_url ? [d.image_url] : []);

  return (
    <View style={{flex:1,backgroundColor:COLORS.bg2}}>
      <View style={{width:40,height:4,borderRadius:99,backgroundColor:COLORS.border,alignSelf:'center',marginTop:10}}/>
      <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',padding:16,borderBottomWidth:0.5,borderBottomColor:COLORS.border}}>
        <Text style={{fontSize:16,fontWeight:'700',color:COLORS.text,flex:1}} numberOfLines={1}>Detalle del chollo</Text>
        <TouchableOpacity onPress={onClose} style={{width:32,height:32,borderRadius:16,backgroundColor:COLORS.bg3,alignItems:'center',justifyContent:'center'}}>
          <Ionicons name="close" size={20} color={COLORS.text2}/>
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={{padding:16,paddingBottom:40}}>
        {/* Images */}
        {images.length > 0 && (
          <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={{marginBottom:16,borderRadius:14,overflow:'hidden',height:200}}>
            {images.map((img,i) => (
              <Image key={i} source={{uri:img.startsWith('http')?img:`https://web-production-a8023.up.railway.app${img}`}}
                style={{width:300,height:200,marginRight:8,borderRadius:14}} resizeMode="cover"/>
            ))}
          </ScrollView>
        )}

        {d.store && <Text style={{fontSize:13,fontWeight:'600',color:COLORS.primary,marginBottom:4}}>{d.store}</Text>}
        <Text style={{fontSize:20,fontWeight:'800',color:COLORS.text,marginBottom:8}}>{d.title}</Text>
        <View style={{flexDirection:'row',alignItems:'baseline',gap:8,marginBottom:12}}>
          <Text style={{fontSize:28,fontWeight:'900',color:d.deal_price===0?COLORS.success:COLORS.danger}}>
            {d.deal_price===0?'GRATIS':`${d.deal_price?.toFixed(2).replace(".",",")}€`}
          </Text>
          {d.original_price>0&&<Text style={{fontSize:16,color:COLORS.text3,textDecorationLine:'line-through'}}>{d.original_price?.toFixed(2).replace(".",",")}€</Text>}
          {disc&&<View style={{backgroundColor:'#DC2626',borderRadius:6,paddingHorizontal:8,paddingVertical:3}}><Text style={{fontSize:14,fontWeight:'800',color:'#fff'}}>-{disc}%</Text></View>}
        </View>
        {d.discount_code && (
          <View style={{flexDirection:'row',alignItems:'center',gap:8,backgroundColor:'#FEF3C7',borderRadius:10,padding:10,marginBottom:12,borderWidth:1,borderColor:'#FCD34D'}}>
            <Ionicons name="ticket-outline" size={16} color="#92400E"/>
            <Text style={{flex:1,fontSize:13,fontWeight:'600',color:'#92400E'}}>Código: {d.discount_code}</Text>
          </View>
        )}
        {d.description && <Text style={{fontSize:14,color:COLORS.text2,lineHeight:20,marginBottom:12}}>{d.description}</Text>}
        {d.availability && (
          <View style={{flexDirection:'row',alignItems:'center',gap:6,marginBottom:8}}>
            <Ionicons name={d.availability==='online'?'globe-outline':'storefront-outline'} size={14} color={COLORS.text3}/>
            <Text style={{fontSize:12,color:COLORS.text3}}>{d.availability==='online'?'Disponible online':'Tienda física'}{d.store_location?` · ${d.store_location}`:''}</Text>
          </View>
        )}
        {(d.starts_at||d.expires_at) && (
          <View style={{flexDirection:'row',alignItems:'center',gap:6,marginBottom:12}}>
            <Ionicons name="calendar-outline" size={14} color={COLORS.text3}/>
            <Text style={{fontSize:12,color:COLORS.text3}}>
              {d.starts_at?`Desde ${new Date(d.starts_at).toLocaleDateString('es-ES')}`:''}{d.starts_at&&d.expires_at?' · ':''}{d.expires_at?`Hasta ${new Date(d.expires_at).toLocaleDateString('es-ES')}`:''}
            </Text>
          </View>
        )}

        {/* Votes & verify */}
        <View style={{backgroundColor:COLORS.bg3,borderRadius:14,padding:14,marginBottom:14,gap:10}}>
          <Text style={{fontSize:13,fontWeight:'700',color:COLORS.text}}>¿Es cierto este chollo?</Text>
          <View style={{flexDirection:'row',alignItems:'center',gap:12}}>
            <TouchableOpacity style={[s.voteBtn,{paddingHorizontal:16,paddingVertical:10},userVote==='up'&&{backgroundColor:'#DCFCE7'}]}
              onPress={()=>onVote(d.id,userVote==='up'?'none':'up')}>
              <Ionicons name={userVote==='up'?'thumbs-up':'thumbs-up-outline'} size={18} color={userVote==='up'?COLORS.success:COLORS.text3}/>
              <Text style={{fontSize:14,fontWeight:'700',color:userVote==='up'?COLORS.success:COLORS.text2}}>{d.votes_up||0}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.voteBtn,{paddingHorizontal:16,paddingVertical:10},userVote==='down'&&{backgroundColor:'#FEE2E2'}]}
              onPress={()=>onVote(d.id,userVote==='down'?'none':'down')}>
              <Ionicons name={userVote==='down'?'thumbs-down':'thumbs-down-outline'} size={18} color={userVote==='down'?COLORS.danger:COLORS.text3}/>
              <Text style={{fontSize:14,fontWeight:'700',color:userVote==='down'?COLORS.danger:COLORS.text2}}>{d.votes_down||0}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{flexDirection:'row',alignItems:'center',gap:4,paddingHorizontal:10,paddingVertical:8,backgroundColor:'#FEF3C7',borderRadius:10}}
              onPress={()=>onReportExpired(d.id)}>
              <Ionicons name="time-outline" size={14} color="#92400E"/>
              <Text style={{fontSize:11,fontWeight:'600',color:'#92400E'}}>Agotada</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{flexDirection:'row',alignItems:'center',gap:4,paddingHorizontal:10,paddingVertical:8,backgroundColor:'#FEF2F2',borderRadius:10}}
              onPress={()=>onReport(d.id)}>
              <Ionicons name="alert-circle-outline" size={14} color={COLORS.danger}/>
              <Text style={{fontSize:11,fontWeight:'600',color:COLORS.danger}}>Reportar timo</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Actions */}
        {d.url && (
          <TouchableOpacity style={{backgroundColor:COLORS.primary,borderRadius:14,padding:14,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8,marginBottom:10}}
            onPress={()=>openURL(d.url)}>
            <Ionicons name="open-outline" size={18} color="#fff"/>
            <Text style={{color:'#fff',fontWeight:'700',fontSize:15}}>Ir al chollo</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={{backgroundColor:COLORS.bg3,borderRadius:14,padding:14,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8}}
          onPress={onComments}>
          <Ionicons name="chatbubble-outline" size={18} color={COLORS.text2}/>
          <Text style={{color:COLORS.text2,fontWeight:'700',fontSize:15}}>Comentarios</Text>
        </TouchableOpacity>
        {(isAdmin || d.reported_by===userId)&&(
          <TouchableOpacity style={{backgroundColor:COLORS.primaryLight,borderRadius:14,padding:14,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8,marginTop:8,borderWidth:1,borderColor:COLORS.primary}}
            onPress={()=>onEdit?.()}>
            <Ionicons name="create-outline" size={18} color={COLORS.primary}/>
            <Text style={{color:COLORS.primary,fontWeight:'700',fontSize:15}}>Editar chollo</Text>
          </TouchableOpacity>
        )}
        {isAdmin&&(
          <TouchableOpacity style={{backgroundColor:'#FEF2F2',borderRadius:14,padding:14,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8,marginTop:8,borderWidth:1,borderColor:COLORS.danger}}
            onPress={()=>Alert.alert('Eliminar chollo','¿Seguro que quieres eliminar este chollo?',[{text:'Cancelar'},{text:'Eliminar',style:'destructive',onPress:()=>onDelete(d.id)}])}>
            <Ionicons name="trash-outline" size={18} color={COLORS.danger}/>
            <Text style={{color:COLORS.danger,fontWeight:'700',fontSize:15}}>Eliminar (Admin)</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

// ── EDIT DEAL MODAL (slides) ─────────────────────────────────────────────────
function EditDealModal({ visible, deal, onClose, onSave }) {
  const [step, setStep] = useState(0);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dealPrice, setDealPrice] = useState('');
  const [originalPrice, setOriginalPrice] = useState('');
  const [store, setStore] = useState('');
  const [url, setUrl] = useState('');
  const [discountCode, setDiscountCode] = useState('');
  const [category, setCategory] = useState('');
  const [photos, setPhotos] = useState([]);

  useEffect(() => {
    if (deal) {
      setTitle(deal.title||'');setDescription(deal.description||'');
      setDealPrice(deal.deal_price!=null?String(deal.deal_price).replace('.',','):'');
      setOriginalPrice(deal.original_price?String(deal.original_price).replace('.',','):'');
      setStore(deal.store||'');setUrl(deal.url||'');setDiscountCode(deal.discount_code||'');
      setCategory(deal.category||'');setStep(0);
      const imgs = Array.isArray(deal.images)&&deal.images.length>0?deal.images:(deal.image_url?[deal.image_url]:[]);
      setPhotos(imgs.map(u=>u.startsWith('http')?u:`https://web-production-a8023.up.railway.app${u}`));
    }
  }, [deal]);

  async function pickPhoto(){
    const r=await ImagePicker.launchImageLibraryAsync({mediaTypes:['images'],quality:0.7,base64:true});
    if(!r.canceled&&r.assets?.[0]){
      const asset=r.assets[0];
      if(asset.base64){setPhotos(prev=>[...prev,`data:image/jpeg;base64,${asset.base64}`]);}
      else{setPhotos(prev=>[...prev,asset.uri]);}
    }
  }

  const inp={backgroundColor:COLORS.bg3,borderRadius:12,paddingHorizontal:14,paddingVertical:10,fontSize:14,color:COLORS.text,borderWidth:1,borderColor:COLORS.border};
  const STEPS=3;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':'height'}>
        <View style={{flex:1,backgroundColor:COLORS.bg2}}>
          <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',padding:16,borderBottomWidth:.5,borderBottomColor:COLORS.border}}>
            <TouchableOpacity onPress={step>0?()=>setStep(step-1):onClose} style={{width:32,height:32,borderRadius:16,backgroundColor:COLORS.bg3,alignItems:'center',justifyContent:'center'}}>
              <Ionicons name={step>0?'arrow-back':'close'} size={20} color={COLORS.text2}/>
            </TouchableOpacity>
            <Text style={{fontSize:18,fontWeight:'700',color:COLORS.text}}>Editar chollo</Text>
            <Text style={{fontSize:12,color:COLORS.text3}}>Paso {step+1}/{STEPS}</Text>
          </View>
          <View style={{flexDirection:'row',paddingHorizontal:16,paddingVertical:6,gap:4}}>
            {[0,1,2].map(i=>(<View key={i} style={{flex:1,height:3,borderRadius:2,backgroundColor:i<=step?COLORS.primary:COLORS.border}}/>))}
          </View>
          <ScrollView contentContainerStyle={{padding:16,paddingBottom:60,gap:10}} keyboardShouldPersistTaps="handled">
            {step===0&&(<>
              <Text style={{fontSize:20,fontWeight:'700',color:COLORS.text,textAlign:'center'}}>Información</Text>
              <Text style={{fontSize:12,fontWeight:'600',color:COLORS.text}}>Título *</Text>
              <TextInput style={inp} value={title} onChangeText={setTitle} placeholder="Título del chollo" placeholderTextColor={COLORS.text3}/>
              <Text style={{fontSize:12,fontWeight:'600',color:COLORS.text}}>Tienda</Text>
              <TextInput style={inp} value={store} onChangeText={setStore} placeholder="Tienda" placeholderTextColor={COLORS.text3}/>
              <Text style={{fontSize:12,fontWeight:'600',color:COLORS.text}}>Descripción</Text>
              <TextInput style={[inp,{height:80,textAlignVertical:'top'}]} value={description} onChangeText={setDescription} placeholder="Descripción..." placeholderTextColor={COLORS.text3} multiline/>
              <Text style={{fontSize:12,fontWeight:'600',color:COLORS.text}}>Enlace</Text>
              <TextInput style={inp} value={url} onChangeText={setUrl} placeholder="https://..." placeholderTextColor={COLORS.text3} autoCapitalize="none"/>
              <TouchableOpacity style={{backgroundColor:COLORS.primary,borderRadius:14,padding:16,alignItems:'center',marginTop:8}} onPress={()=>setStep(1)}>
                <Text style={{color:'#fff',fontWeight:'700',fontSize:16}}>Siguiente</Text>
              </TouchableOpacity>
            </>)}
            {step===1&&(<>
              <Text style={{fontSize:20,fontWeight:'700',color:COLORS.text,textAlign:'center'}}>Fotos</Text>
              <Text style={{fontSize:12,color:COLORS.text3,textAlign:'center'}}>Añade o cambia las fotos del chollo</Text>
              <View style={{flexDirection:'row',flexWrap:'wrap',gap:8,marginTop:8}}>
                {photos.map((p,i)=>(
                  <View key={i} style={{width:100,height:100,borderRadius:12,overflow:'hidden',position:'relative'}}>
                    <Image source={{uri:p}} style={{width:'100%',height:'100%'}} resizeMode="cover"/>
                    <TouchableOpacity onPress={()=>setPhotos(prev=>prev.filter((_,j)=>j!==i))}
                      style={{position:'absolute',top:4,right:4,width:22,height:22,borderRadius:11,backgroundColor:'rgba(0,0,0,.6)',alignItems:'center',justifyContent:'center'}}>
                      <Ionicons name="close" size={14} color="#fff"/>
                    </TouchableOpacity>
                  </View>
                ))}
                <TouchableOpacity onPress={pickPhoto}
                  style={{width:100,height:100,borderRadius:12,borderWidth:2,borderColor:COLORS.border,borderStyle:'dashed',alignItems:'center',justifyContent:'center',backgroundColor:COLORS.bg3}}>
                  <Ionicons name="camera-outline" size={28} color={COLORS.text3}/>
                  <Text style={{fontSize:10,color:COLORS.text3,marginTop:2}}>Añadir</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity style={{backgroundColor:COLORS.primary,borderRadius:14,padding:16,alignItems:'center',marginTop:12}} onPress={()=>setStep(2)}>
                <Text style={{color:'#fff',fontWeight:'700',fontSize:16}}>Siguiente</Text>
              </TouchableOpacity>
            </>)}
            {step===2&&(<>
              <Text style={{fontSize:20,fontWeight:'700',color:COLORS.text,textAlign:'center'}}>Precios</Text>
              <Text style={{fontSize:12,fontWeight:'600',color:COLORS.text}}>Precio del chollo *</Text>
              <View style={{flexDirection:'row',alignItems:'center',backgroundColor:COLORS.bg3,borderRadius:12,paddingHorizontal:14,borderWidth:1,borderColor:COLORS.border}}>
                <TextInput style={{flex:1,paddingVertical:10,fontSize:18,fontWeight:'700',color:COLORS.primary}} value={dealPrice} onChangeText={setDealPrice} placeholder="0,00" placeholderTextColor={COLORS.text3} keyboardType="decimal-pad"/>
                <Text style={{fontSize:16,fontWeight:'700',color:COLORS.text3}}>€</Text>
              </View>
              <Text style={{fontSize:12,fontWeight:'600',color:COLORS.text}}>Precio original</Text>
              <View style={{flexDirection:'row',alignItems:'center',backgroundColor:COLORS.bg3,borderRadius:12,paddingHorizontal:14,borderWidth:1,borderColor:COLORS.border}}>
                <TextInput style={{flex:1,paddingVertical:10,fontSize:16,color:COLORS.text}} value={originalPrice} onChangeText={setOriginalPrice} placeholder="0,00" placeholderTextColor={COLORS.text3} keyboardType="decimal-pad"/>
                <Text style={{fontSize:16,fontWeight:'700',color:COLORS.text3}}>€</Text>
              </View>
              <Text style={{fontSize:12,fontWeight:'600',color:COLORS.text}}>Código de descuento</Text>
              <TextInput style={inp} value={discountCode} onChangeText={setDiscountCode} placeholder="Código (opcional)" placeholderTextColor={COLORS.text3}/>
              <TouchableOpacity style={{backgroundColor:COLORS.primary,borderRadius:14,padding:16,alignItems:'center',marginTop:12}}
                onPress={async()=>{const body={title:title.trim(),description,store,url,discount_code:discountCode,category};
                  body.deal_price=parseFloat(String(dealPrice).replace(',','.'));
                  if(originalPrice)body.original_price=parseFloat(String(originalPrice).replace(',','.'));
                  body.photos = photos.filter(p => p.startsWith('http'));
                  // Upload new photos via base64
                  const newPhotos = photos.filter(p => p.startsWith('data:'));
                  if (newPhotos.length > 0) body.image_base64 = newPhotos[0];
                  // Handle file:// URIs as fallback
                  for (const p of photos) {
                    if (!p.startsWith('http') && !p.startsWith('data:')) {
                      try {
                        const FileSystem = require('expo-file-system');
                        const b64 = await FileSystem.readAsStringAsync(p, { encoding: FileSystem.EncodingType.Base64 });
                        body.image_base64 = `data:image/jpeg;base64,${b64}`;
                      } catch(e) { console.warn('b64 fail', e); }
                    }
                  }
                  onSave?.(deal.id,body);}}>
                <View style={{flexDirection:'row',alignItems:'center',gap:8}}>
                  <Ionicons name="checkmark-circle" size={20} color="#fff"/>
                  <Text style={{color:'#fff',fontWeight:'700',fontSize:16}}>Guardar cambios</Text>
                </View>
              </TouchableOpacity>
            </>)}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  safe:{flex:1,backgroundColor:COLORS.bg},
  header:{backgroundColor:COLORS.bg2,borderBottomWidth:0.5,borderBottomColor:COLORS.border},
  headerRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:14,paddingTop:10,paddingBottom:6},
  logo:{fontSize:18,fontWeight:'800',color:COLORS.text},
  headerBtn:{width:36,height:36,borderRadius:18,backgroundColor:COLORS.bg3,alignItems:'center',justifyContent:'center'},
  pill:{flexDirection:'row',alignItems:'center',gap:4,paddingHorizontal:12,paddingVertical:6,borderRadius:99,borderWidth:1.5,borderColor:COLORS.border,backgroundColor:COLORS.bg2},
  pillOn:{backgroundColor:COLORS.primary,borderColor:COLORS.primary},
  pillTxt:{fontSize:12,fontWeight:'600',color:COLORS.text2},
  card:{backgroundColor:COLORS.bg2,borderRadius:14,padding:12,borderWidth:0.5,borderColor:COLORS.border},
  cardImg:{width:100,height:100,borderRadius:10,backgroundColor:COLORS.bg3,alignItems:'center',justifyContent:'center',overflow:'hidden'},
  cardTitle:{fontSize:14,fontWeight:'600',color:COLORS.text,lineHeight:18},
  cardPrice:{fontSize:20,fontWeight:'900',color:COLORS.danger},
  cardOldPrice:{fontSize:13,color:COLORS.text3,textDecorationLine:'line-through'},
  discBadge:{position:'absolute',top:6,left:6,backgroundColor:'#DC2626',borderRadius:6,paddingHorizontal:6,paddingVertical:2},
  discTxt:{fontSize:11,fontWeight:'800',color:'#fff'},
  voteBtn:{flexDirection:'row',alignItems:'center',gap:4,paddingHorizontal:8,paddingVertical:5,borderRadius:8,backgroundColor:COLORS.bg3},
  voteTxt:{fontSize:12,fontWeight:'700',color:COLORS.text2},
  goBtn:{flexDirection:'row',alignItems:'center',gap:4,backgroundColor:COLORS.primary,borderRadius:8,paddingHorizontal:10,paddingVertical:5,marginLeft:'auto'},
  goTxt:{fontSize:11,fontWeight:'700',color:'#fff'},
  fab:{position:'absolute',bottom:16,right:16,width:52,height:52,borderRadius:99,backgroundColor:'#DC2626',alignItems:'center',justifyContent:'center',
    shadowColor:'#000',shadowOpacity:0.25,shadowRadius:8,elevation:6},
});
