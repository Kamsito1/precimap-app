import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Linking, ActivityIndicator, RefreshControl, Modal,
  ScrollView, TextInput, KeyboardAvoidingView, Platform, Alert, Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
// expo-location cargado de forma diferida — import estático crashea en iOS/Hermes
const getLocation = () => require('expo-location');
import { COLORS, apiGet, apiPost, timeAgo, MONTHS_ES, openURL } from '../utils';
import { useAuth } from '../contexts/AuthContext';
import AuthModal from '../components/AuthModal';
import CityPicker from '../components/CityPicker';
import AdBanner from '../components/AdBanner';

const CATS = [
  { key:'all',         label:'Todos',      emoji:'🎭' },
  { key:'musica',      label:'Música',     emoji:'🎵' },
  { key:'deporte',     label:'Deporte',    emoji:'⚽' },
  { key:'cultura',     label:'Cultura',    emoji:'🏛️' },
  { key:'festival',    label:'Festival',   emoji:'🎪' },
  { key:'expo',        label:'Expo',       emoji:'🖼️' },
  { key:'gastronomia', label:'Gastro',     emoji:'🍷' },
  { key:'cine',        label:'Cine',       emoji:'🎬' },
  { key:'teatro',      label:'Teatro',     emoji:'🎭' },
  { key:'otro',        label:'Otros',      emoji:'📌' },
];

const SORTS = [
  { key:'date', label:'📅 Próximos' },
  { key:'price', label:'💰 Más baratos' },
];

const SOURCES = [
  { key:'all', label:'Todos', emoji:'🌐' },
  { key:'user', label:'Comunidad', emoji:'👥' },
  { key:'ayuntamiento', label:'Ayuntamiento', emoji:'🏛️' },
];

export default function EventsScreen() {
  const { isLoggedIn, user } = useAuth();
  const [events, setEvents] = useState([]);
  const [cat, setCat] = useState('all');
  const [sort, setSort] = useState('date');
  const [source, setSource] = useState('all');
  const [priceFilter, setPriceFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [city, setCity] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => { loadEvents(); }, [cat, sort, source, city]);

  // Debounced search — skip initial render
  const searchMounted = React.useRef(false);
  useEffect(() => {
    if (!searchMounted.current) { searchMounted.current = true; return; }
    const t = setTimeout(() => loadEvents(), 400);
    return () => clearTimeout(t);
  }, [search]);
  async function loadEvents() {
    try {
      let url = `/api/events?cat=${cat}&sort=${sort}`;
      if (source !== 'all') url += `&source=${source}`;
      if (city) url += `&city=${encodeURIComponent(city)}`;
      if (search.trim()) url += `&search=${encodeURIComponent(search.trim())}`;
      setEvents(await apiGet(url) || []);
    } catch(_) {} finally { setLoading(false); setRefreshing(false); }
  }

  const onRefresh = useCallback(() => { setRefreshing(true); loadEvents(); }, [cat, sort, source, city, search]);

  const ayuntamientoCount = events.filter(e => e.source === 'ayuntamiento').length;
  const userCount = events.filter(e => e.source === 'user').length;
  const freeCount = events.filter(e => e.is_free).length;
  const paidCount = events.filter(e => !e.is_free).length;

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        {/* Title row */}
        <View style={s.headerRow}>
          <View>
            <Text style={s.title}>🎭 Eventos</Text>
            <Text style={s.sub}>
              {events.length > 0
                ? `${events.length} próximos · ${freeCount} gratis · ${paidCount} de pago`
                : 'Sin eventos — sé el primero en añadir uno'}
            </Text>
          </View>
          <View style={s.headerBtns}>
            <TouchableOpacity style={s.filterIconBtn} onPress={() => setShowFilters(!showFilters)}>
              <Ionicons name="options-outline" size={20} color={showFilters ? COLORS.purple : COLORS.text2}/>
            </TouchableOpacity>
            <TouchableOpacity style={s.addBtn} onPress={() => isLoggedIn ? setShowAdd(true) : setShowAuth(true)}>
              <Ionicons name="add" size={18} color="#fff"/>
              <Text style={s.addBtnTxt}>Añadir</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Next event highlight banner — shows most voted upcoming event */}
        {events.length > 0 && (() => {
          const upcoming = events.filter(e => e?.date && new Date(e.date) >= new Date());
          const next = upcoming.length > 0 ? upcoming.reduce((best, e) => (e.votes_up||0) > (best.votes_up||0) ? e : best, upcoming[0]) : null;
          if (!next?.date) return null;
          const nextDate = new Date(next.date);
          const daysUntil = Math.max(0, Math.ceil((nextDate - new Date()) / 86400000));
          return (
            <TouchableOpacity
              style={{backgroundColor:COLORS.purple+'18',marginHorizontal:12,marginBottom:8,borderRadius:12,padding:12,borderWidth:1,borderColor:COLORS.purple+'44',flexDirection:'row',alignItems:'center',gap:10}}
              onPress={() => {}}
              activeOpacity={0.8}>
              <View style={{backgroundColor:COLORS.purple,borderRadius:8,padding:8,alignItems:'center',minWidth:48}}>
                <Text style={{fontSize:9,fontWeight:'700',color:'rgba(255,255,255,0.8)',textTransform:'uppercase'}}>
                  {daysUntil === 0 ? 'HOY' : daysUntil === 1 ? 'MAÑANA' : `en ${daysUntil}d`}
                </Text>
                <Text style={{fontSize:18,color:'#fff',fontWeight:'800'}}>
                  {nextDate.getDate()}
                </Text>
              </View>
              <View style={{flex:1}}>
                <Text style={{fontSize:13,fontWeight:'700',color:COLORS.text}} numberOfLines={1}>{next.title}</Text>
                <Text style={{fontSize:11,color:COLORS.text3,marginTop:2}}>
                  📍 {next.city} · {next.is_free ? '🆓 Gratis' : next.price_from ? `desde ${next.price_from}€` : 'Ver precio'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={14} color={COLORS.purple}/>
            </TouchableOpacity>
          );
        })()}

        {/* Source pills — Todos / Comunidad / Ayuntamiento */}
        <View style={s.sourceRow}>
          {SOURCES.map(src => (
            <TouchableOpacity key={src.key} style={[s.sourceBtn, source===src.key && s.sourceBtnOn]} onPress={() => setSource(src.key)}>
              <Text style={s.sourceEmoji}>{src.emoji}</Text>
              <Text style={[s.sourceTxt, source===src.key && {color:'#fff'}]}>{src.label}</Text>
            </TouchableOpacity>
          ))}
          {ayuntamientoCount > 0 && source !== 'ayuntamiento' && (
            <View style={s.officialBadge}>
              <Text style={s.officialBadgeTxt}>🏛️ {ayuntamientoCount} oficiales</Text>
            </View>
          )}
          {/* Price filter pills */}
          {[['all','Todos'],['free','🆓 Gratis'],['paid','💰 De pago']].map(([key,label]) => (
            <TouchableOpacity key={key}
              style={[s.sourceBtn, priceFilter===key && s.sourceBtnOn]}
              onPress={() => setPriceFilter(key)}>
              <Text style={[s.sourceTxt, priceFilter===key && {color:'#fff'}]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Category pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={{paddingHorizontal:12,gap:6,paddingBottom:8}}>
          {CATS.map(c => {
            const count = c.key === 'all' ? events.length : events.filter(e => e.category === c.key).length;
            if (c.key !== 'all' && count === 0) return null;
            return (
              <TouchableOpacity key={c.key} style={[s.catBtn, cat===c.key && s.catBtnOn]} onPress={() => setCat(c.key)}>
                <Text style={s.catEmoji}>{c.emoji}</Text>
                <Text style={[s.catTxt, cat===c.key && {color:'#fff'}]}>{c.label}</Text>
                {count > 0 && c.key !== 'all' && <Text style={{fontSize:9,color:cat===c.key?'rgba(255,255,255,0.8)':COLORS.text3,fontWeight:'700'}}>{count}</Text>}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Filter panel */}
        {showFilters && (
          <View style={s.filtersPanel}>
            {/* Search box */}
            <View style={{flexDirection:'row',alignItems:'center',backgroundColor:COLORS.bg3,borderRadius:10,paddingHorizontal:10,marginBottom:10,borderWidth:1,borderColor:COLORS.border}}>
              <Ionicons name="search-outline" size={16} color={COLORS.text3}/>
              <TextInput
                style={{flex:1,paddingVertical:8,paddingHorizontal:6,fontSize:13,color:COLORS.text}}
                placeholder="Buscar eventos..."
                placeholderTextColor={COLORS.text3}
                value={search}
                onChangeText={setSearch}
                returnKeyType="search"
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch('')}>
                  <Ionicons name="close-circle" size={16} color={COLORS.text3}/>
                </TouchableOpacity>
              )}
            </View>
            <Text style={s.filterLabel}>Ordenar por</Text>
            <View style={s.radRow}>
              {SORTS.map(so => (
                <TouchableOpacity key={so.key} style={[s.sortBtn, sort===so.key && s.sortBtnOn]} onPress={() => setSort(so.key)}>
                  <Text style={[s.sortTxt, sort===so.key && {color:'#fff'}]}>{so.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={s.filterLabel}>Filtrar por ciudad / provincia</Text>
            <CityPicker value={city} onChange={setCity} placeholder="Toda España"/>
          </View>
        )}
      </View>

      {/* Official source banner */}
      {source === 'ayuntamiento' && (
        <View style={s.officialBanner}>
          <Ionicons name="shield-checkmark-outline" size={14} color={COLORS.primary}/>
          <Text style={s.officialBannerTxt}>Eventos extraídos automáticamente de webs oficiales de ayuntamientos. Se actualiza cada 6 horas.</Text>
        </View>
      )}

      {!isLoggedIn && (
        <TouchableOpacity style={s.guestBanner} onPress={() => setShowAuth(true)}>
          <Text style={s.guestTxt}>🎭 Regístrate para añadir eventos y recibir alertas →</Text>
        </TouchableOpacity>
      )}

      {loading ? <ActivityIndicator color={COLORS.purple} style={{marginTop:50}}/> : (
        <FlatList
          data={events.filter(e => {
            if (priceFilter === 'free') return e.is_free;
            if (priceFilter === 'paid') return !e.is_free;
            return true;
          })}
          keyExtractor={e => String(e.id)}
          contentContainerStyle={{padding:12,gap:10,paddingBottom:100}}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.purple}/>}
          renderItem={({item}) => (
            <EventCard event={item} onAuthNeeded={() => setShowAuth(true)} isLoggedIn={isLoggedIn} onRefresh={loadEvents} user={user}/>
          )}
          ListEmptyComponent={<EmptyEvents onAdd={() => isLoggedIn ? setShowAdd(true) : setShowAuth(true)} source={source}/>}
        />
      )}

      <AddEventModal visible={showAdd} onClose={() => setShowAdd(false)} onSuccess={() => { setShowAdd(false); loadEvents(); }}/>
      <AuthModal visible={showAuth} onClose={() => setShowAuth(false)}/>

      <AdBanner screen="events"/>

      {/* FAB */}
      <TouchableOpacity
        style={{position:'absolute',bottom:80,right:16,backgroundColor:COLORS.purple||'#7C3AED',borderRadius:28,paddingHorizontal:18,paddingVertical:14,flexDirection:'row',alignItems:'center',gap:6,shadowColor:'#7C3AED',shadowOpacity:0.45,shadowRadius:12,shadowOffset:{width:0,height:4},elevation:8}}
        onPress={() => isLoggedIn ? setShowAdd(true) : setShowAuth(true)}
        activeOpacity={0.85}>
        <Ionicons name="add" size={26} color="#fff"/>
        <Text style={{color:'#fff',fontWeight:'800',fontSize:14}}>Evento</Text>
      </TouchableOpacity>

    </SafeAreaView>
  );
}

// === EVENT CARD ===
function EventCard({ event: ev, onAuthNeeded, isLoggedIn, onRefresh, user }) {
  // Guard against null/invalid date
  const rawDate = ev?.date || '';
  const d = rawDate ? new Date(rawDate + 'T12:00:00') : null;
  const isValidDate = d && !isNaN(d.getTime());
  const day   = isValidDate ? d.getDate() : '?';
  const month = isValidDate ? (MONTHS_ES[d.getMonth()] || '').toUpperCase() : '';
  const todayStr    = new Date().toISOString().split('T')[0];
  const tomorrowStr = new Date(Date.now()+86400000).toISOString().split('T')[0];
  const isToday    = rawDate === todayStr;
  const isTomorrow = rawDate === tomorrowStr;
  const CAT_EMOJI = {cine:'🎬',musica:'🎵',teatro:'🎭',deporte:'⚽',gastronomia:'🍷',festival:'🎪',expo:'🖼️',otro:'📌'};
  const emoji = CAT_EMOJI[ev?.category] || '📌';
  const isOfficial = ev?.source === 'ayuntamiento';

  async function vote() {
    if (!isLoggedIn) { onAuthNeeded(); return; }
    try {
      await apiPost(`/api/events/${ev.id}/vote`, {});
      onRefresh();
    } catch(_) {}
  }

  function openMaps() {
    if (ev?.lat && ev?.lng) {
      const isWeb = typeof document !== 'undefined';
      const googleUrl = `https://www.google.com/maps/dir/?api=1&destination=${ev.lat},${ev.lng}`;
      if (isWeb) { openURL(googleUrl); return; }
      const url = Platform.OS === 'ios'
        ? `maps://maps.apple.com/?daddr=${ev.lat},${ev.lng}&q=${encodeURIComponent(ev.venue||ev.title||'')}`
        : `geo:${ev.lat},${ev.lng}?q=${encodeURIComponent(ev.venue||ev.title||'')}`;
      Linking.openURL(url).catch(() => openURL(googleUrl));
    } else if (ev?.venue || ev?.address) {
      const q = encodeURIComponent(`${ev.venue||''} ${ev.address||''} ${ev.city||''}`);
      openURL(`https://www.google.com/maps/search/?api=1&query=${q}`);
    }
  }

  return (
    <View style={ec.card}>
      {isOfficial && (
        <View style={ec.officialStripe}>
          <Ionicons name="shield-checkmark" size={11} color="#fff"/>
          <Text style={ec.officialStripeTxt}>Fuente oficial · Ayuntamiento</Text>
        </View>
      )}
      <View style={ec.header}>
        <View style={ec.dateBadge}>
          <Text style={ec.day}>{day}</Text>
          <Text style={ec.month}>{month}</Text>
          {isToday ? <View style={ec.todayBadge}><Text style={ec.todayTxt}>HOY</Text></View>
          : isTomorrow ? <View style={ec.todayBadge}><Text style={ec.todayTxt}>MAÑ</Text></View>
          : ev?.time ? <Text style={ec.time}>{String(ev.time).slice(0,5)}</Text> : null}
        </View>
        <View style={ec.info}>
          <View style={ec.topRow}>
            <View style={ec.catBadge}><Text style={ec.catBadgeTxt}>{emoji} {ev?.category || 'otro'}</Text></View>
            {ev?.is_free
              ? <View style={ec.freeBadge}><Text style={ec.freeTxt}>GRATIS</Text></View>
              : ev?.price_from != null
                ? <View style={ec.paidBadge}><Text style={ec.paidTxt}>desde {Number(ev.price_from||0).toFixed(2)}€</Text></View>
                : ev?.price_label
                  ? <View style={ec.paidBadge}><Text style={ec.paidTxt}>{ev.price_label}</Text></View>
                  : null}
          </View>
          <Text style={ec.title} numberOfLines={2}>{ev?.title || 'Evento'}</Text>
          {(ev?.venue || ev?.address) ? (
            <Text style={ec.venue} numberOfLines={1}>
              📍 {ev.venue || ev.address}{ev?.city ? ` · ${ev.city}` : ''}
            </Text>
          ) : null}
          {ev?.description ? <Text style={ec.desc} numberOfLines={2}>{ev.description}</Text> : null}
        </View>
      </View>
      <View style={ec.footer}>
        <TouchableOpacity style={ec.navBtn} onPress={openMaps}>
          <Ionicons name="navigate-outline" size={13} color="#fff"/>
          <Text style={ec.navBtnTxt}>Cómo llegar</Text>
        </TouchableOpacity>
        {ev?.url ? (
          <TouchableOpacity style={ec.ticketBtn} onPress={() => openURL(ev.url)}>
            <Ionicons name="open-outline" size={13} color={COLORS.purple}/>
            <Text style={ec.ticketBtnTxt}>Más info</Text>
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity style={ec.voteBtn} onPress={vote}>
          <Text style={ec.voteTxt}>👍 {ev?.votes_up || 0}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={ec.voteBtn} onPress={async () => {
          const price = ev?.is_free ? '🆓 Gratis' : ev?.price_from ? `desde ${ev.price_from}€` : '';
          const msg = `🎭 ${ev?.title||''}\n📍 ${ev?.city||''} · ${ev?.date||''}\n${price ? price+'\n' : ''}Via PreciMap 🗺️`;
          try {
            if (typeof navigator !== 'undefined' && navigator.share) {
              await navigator.share({ title: ev?.title||'', text: msg, url: ev?.url||'' });
            } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
              await navigator.clipboard.writeText(msg);
              Alert.alert('✅ Copiado', 'Enlace copiado al portapapeles');
            } else {
              Share.share({ message: msg }).catch(()=>{});
            }
          } catch(_) {}
        }}>
          <Ionicons name="share-outline" size={14} color={COLORS.text3}/>
        </TouchableOpacity>
        {user?.is_admin && (
          <TouchableOpacity style={[ec.voteBtn,{backgroundColor:'#FEE2E2',paddingHorizontal:8}]} onPress={() =>
            Alert.alert('🛡️ Admin','¿Eliminar evento?',[
              {text:'Cancelar',style:'cancel'},
              {text:'Eliminar',style:'destructive',onPress:async()=>{
                try { await apiPost(`/api/events/${ev.id}/deactivate`,{}); onRefresh(); } catch(_) {}
              }},
            ])}>
            <Ionicons name="trash-outline" size={13} color="#DC2626"/>
          </TouchableOpacity>
        )}
        <Text style={ec.source} numberOfLines={1}>{isOfficial?'🏛️':('👤 '+(ev?.reporter_name||'').split(' ')[0])}</Text>
      </View>
    </View>
  );
}

function EmptyEvents({ onAdd, source }) {
  const links = [
    { label:'🎵 Concerts & Live Music', url:'https://www.songkick.com/es' },
    { label:'🎭 Fever Events',           url:'https://feverup.com/es/madrid' },
    { label:'🎪 Eventbrite España',      url:'https://www.eventbrite.es/' },
    { label:'🏛️ Cultura en Red',        url:'https://www.culturaydeporte.gob.es/cultura/areas/museos/mc/estadisticas/portada.html' },
  ];
  return (
    <View style={em.wrap}>
      <Text style={em.icon}>{source === 'ayuntamiento' ? '🏛️' : '🎭'}</Text>
      <Text style={em.title}>
        {source === 'ayuntamiento' ? 'Sin eventos oficiales aún' : 'Sin eventos en esta zona'}
      </Text>
      <Text style={em.desc}>
        {source === 'ayuntamiento'
          ? 'Todavía no tenemos eventos de ayuntamientos integrados. Estamos trabajando en conectar con fuentes oficiales.'
          : '¡Sé el primero! Añade eventos de tu ciudad y ayuda a la comunidad a descubrirlos.'}
      </Text>
      {source !== 'ayuntamiento' && (
        <TouchableOpacity style={em.btn} onPress={onAdd}>
          <Ionicons name="add-circle-outline" size={16} color="#fff"/>
          <Text style={em.btnTxt}>Añadir evento</Text>
        </TouchableOpacity>
      )}
      <View style={em.divider}>
        <View style={em.dividerLine}/>
        <Text style={em.dividerTxt}>mientras tanto</Text>
        <View style={em.dividerLine}/>
      </View>
      <Text style={em.linksTitle}>Encuentra eventos en estas webs:</Text>
      {links.map(l => (
        <TouchableOpacity key={l.url} style={em.linkBtn} onPress={() => openURL(l.url)}>
          <Text style={em.linkTxt}>{l.label}</Text>
          <Ionicons name="open-outline" size={12} color={COLORS.primary}/>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// === ADD EVENT MODAL ===
function AddEventModal({ visible, onClose, onSuccess }) {
  const [title, setTitle] = useState('');
  const [cat, setCat] = useState('cine');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [venue, setVenue] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [price, setPrice] = useState('');
  const [isFree, setIsFree] = useState(false);
  const [url, setUrl] = useState('');
  const [desc, setDesc] = useState('');
  const [useGPS, setUseGPS] = useState(false);
  const [gpsCoords, setGpsCoords] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function getGPS() {
    try {
      const Location = getLocation();
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setGpsCoords({ lat: loc.coords.latitude, lng: loc.coords.longitude });
      setUseGPS(true);
    } catch(_) { Alert.alert('Error', 'No se pudo obtener la ubicación'); }
  }

  async function submit() {
    if (!title.trim() || !cat || !date) { setError('Título, categoría y fecha son obligatorios'); return; }
    // Convert DD/MM/YYYY → YYYY-MM-DD for the API
    let isoDate = date;
    if (date.includes('/')) {
      const p = date.split('/');
      if (p.length === 3 && p[2].length === 4) isoDate = `${p[2]}-${p[1].padStart(2,'0')}-${p[0].padStart(2,'0')}`;
      else { setError('Fecha inválida. Usa el formato DD/MM/AAAA'); return; }
    }
    setLoading(true); setError('');
    try {
      const res = await apiPost('/api/events', {
        title: title.trim(), category: cat, date: isoDate, time,
        venue: venue.trim(), address: address.trim(), city: city.trim(),
        lat: gpsCoords?.lat || null, lng: gpsCoords?.lng || null,
        price_from: price && !isFree ? parseFloat(price) : null,
        is_free: isFree ? 1 : 0,
        url: url.trim(), description: desc.trim(),
      });
      if (res.error) { setError(res.error); return; }
      onSuccess?.();
      // Reset
      setTitle(''); setDate(''); setTime(''); setVenue(''); setAddress('');
      setCity(''); setPrice(''); setIsFree(false); setUrl(''); setDesc('');
      setGpsCoords(null); setUseGPS(false);
    } catch(_) { setError('Error de conexión'); }
    finally { setLoading(false); }
  }

  const catOpts = CATS.filter(c => c.key !== 'all');

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={am.wrap} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={am.handle}/>
        <View style={am.header}>
          <Text style={am.title}>🎭 Añadir evento</Text>
          <TouchableOpacity onPress={onClose} style={am.closeBtn}>
            <Ionicons name="close" size={20} color={COLORS.text2}/>
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={am.form} keyboardShouldPersistTaps="handled">
          <View style={am.infoBanner}>
            <Ionicons name="information-circle-outline" size={14} color={COLORS.primary}/>
            <Text style={am.infoTxt}>Solo añade eventos reales. La comunidad votará para confirmar la información. No inventes nada.</Text>
          </View>

          <Text style={am.label}>Título *</Text>
          <TextInput style={am.input} value={title} onChangeText={setTitle}
            placeholder="Nombre del evento" placeholderTextColor={COLORS.text3}/>

          <Text style={am.label}>Categoría *</Text>
          <View style={am.catGrid}>
            {catOpts.map(c => (
              <TouchableOpacity key={c.key} style={[am.catBtn, cat===c.key && am.catBtnOn]} onPress={() => setCat(c.key)}>
                <Text style={am.catEmoji}>{c.emoji}</Text>
                <Text style={[am.catTxt, cat===c.key && {color:'#fff'}]}>{c.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={{flexDirection:'row',gap:10}}>
            <View style={{flex:1}}>
              <Text style={am.label}>Fecha * (DD/MM/AAAA)</Text>
              <TextInput style={am.input} value={date} onChangeText={v => {
                // Auto-format DD/MM/YYYY
                const n = v.replace(/\D/g,'');
                if (n.length <= 2) setDate(n);
                else if (n.length <= 4) setDate(n.slice(0,2)+'/'+n.slice(2));
                else setDate(n.slice(0,2)+'/'+n.slice(2,4)+'/'+n.slice(4,8));
              }} placeholder="01/05/2026" placeholderTextColor={COLORS.text3} keyboardType="number-pad" maxLength={10}/>
            </View>
            <View style={{flex:1}}>
              <Text style={am.label}>Hora</Text>
              <TextInput style={am.input} value={time} onChangeText={setTime} placeholder="20:30" placeholderTextColor={COLORS.text3}/>
            </View>
          </View>

          <Text style={am.label}>Recinto / Lugar</Text>
          <TextInput style={am.input} value={venue} onChangeText={setVenue} placeholder="Ej: Teatro Góngora" placeholderTextColor={COLORS.text3}/>

          <Text style={am.label}>Dirección</Text>
          <TextInput style={am.input} value={address} onChangeText={setAddress} placeholder="Calle y número" placeholderTextColor={COLORS.text3}/>

          <Text style={am.label}>Ciudad</Text>
          <TextInput style={am.input} value={city} onChangeText={setCity} placeholder="Ej: Córdoba" placeholderTextColor={COLORS.text3}/>

          {/* GPS for map */}
          <TouchableOpacity style={[am.gpsBtn, gpsCoords && am.gpsBtnOn]} onPress={getGPS}>
            <Ionicons name={gpsCoords ? "checkmark-circle" : "locate-outline"} size={16} color={gpsCoords ? COLORS.success : COLORS.primary}/>
            <Text style={[am.gpsTxt, gpsCoords && {color:COLORS.success}]}>
              {gpsCoords ? `📍 Ubicación GPS guardada` : 'Añadir ubicación GPS (aparece en el mapa)'}
            </Text>
          </TouchableOpacity>

          {/* Price */}
          <View style={{flexDirection:'row',gap:10,alignItems:'flex-end'}}>
            <View style={{flex:1}}>
              <Text style={am.label}>Precio desde (€)</Text>
              <TextInput style={[am.input, isFree && {opacity:0.4}]} value={price} onChangeText={setPrice}
                placeholder="Ej: 15" keyboardType="decimal-pad" placeholderTextColor={COLORS.text3} editable={!isFree}/>
            </View>
            <TouchableOpacity style={[am.freeToggle, isFree && am.freeToggleOn]} onPress={() => setIsFree(!isFree)}>
              <Text style={[am.freeToggleTxt, isFree && {color:'#fff'}]}>{isFree ? '✅ Gratis' : '¿Gratis?'}</Text>
            </TouchableOpacity>
          </View>

          <Text style={am.label}>URL (entradas / más info)</Text>
          <TextInput style={am.input} value={url} onChangeText={setUrl} placeholder="https://..." keyboardType="url" autoCapitalize="none" placeholderTextColor={COLORS.text3}/>

          <Text style={am.label}>Descripción breve</Text>
          <TextInput style={[am.input,{height:70,textAlignVertical:'top'}]} value={desc} onChangeText={setDesc} placeholder="Descripción del evento..." multiline placeholderTextColor={COLORS.text3}/>

          {error ? <View style={am.errBox}><Text style={am.errTxt}>{error}</Text></View> : null}

          <TouchableOpacity style={[am.submitBtn, loading && {opacity:0.7}]} onPress={submit} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff"/> : <><Ionicons name="calendar" size={17} color="#fff"/><Text style={am.submitTxt}> Publicar evento (+5 pts)</Text></>}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  safe:{flex:1,backgroundColor:COLORS.bg},
  header:{backgroundColor:COLORS.bg2,borderBottomWidth:0.5,borderBottomColor:COLORS.border},
  headerRow:{flexDirection:'row',justifyContent:'space-between',alignItems:'flex-start',paddingHorizontal:16,paddingTop:14,paddingBottom:8},
  title:{fontSize:22,fontWeight:'700',color:COLORS.text},
  sub:{fontSize:12,color:COLORS.text3,marginTop:1},
  headerBtns:{flexDirection:'row',alignItems:'center',gap:8},
  filterIconBtn:{padding:6,borderRadius:10,backgroundColor:COLORS.bg,borderWidth:1,borderColor:COLORS.border},
  addBtn:{flexDirection:'row',alignItems:'center',gap:4,backgroundColor:COLORS.purple,borderRadius:99,paddingHorizontal:12,paddingVertical:7},
  addBtnTxt:{color:'#fff',fontWeight:'700',fontSize:13},
  sourceRow:{flexDirection:'row',gap:6,paddingHorizontal:12,paddingBottom:8,flexWrap:'wrap'},
  sourceBtn:{flexDirection:'row',alignItems:'center',gap:4,paddingHorizontal:10,paddingVertical:5,borderRadius:99,borderWidth:1.5,borderColor:COLORS.border,backgroundColor:COLORS.bg},
  sourceBtnOn:{backgroundColor:COLORS.purple,borderColor:COLORS.purple},
  sourceEmoji:{fontSize:13},
  sourceTxt:{fontSize:12,fontWeight:'500',color:COLORS.text2},
  officialBadge:{backgroundColor:'#EFF6FF',borderRadius:99,paddingHorizontal:9,paddingVertical:4,borderWidth:1,borderColor:'#BFDBFE'},
  officialBadgeTxt:{fontSize:11,fontWeight:'600',color:COLORS.primary},
  catBtn:{flexDirection:'row',alignItems:'center',gap:4,paddingHorizontal:10,paddingVertical:5,borderRadius:99,borderWidth:1.5,borderColor:COLORS.border,backgroundColor:COLORS.bg},
  catBtnOn:{backgroundColor:COLORS.purple,borderColor:COLORS.purple},
  catEmoji:{fontSize:13},catTxt:{fontSize:12,fontWeight:'500',color:COLORS.text2},
  filtersPanel:{backgroundColor:COLORS.bg,marginHorizontal:12,marginBottom:6,borderRadius:14,padding:12,borderWidth:1,borderColor:COLORS.border},
  filterLabel:{fontSize:12,fontWeight:'700',color:COLORS.text,marginBottom:6,marginTop:4},
  radRow:{flexDirection:'row',gap:6,flexWrap:'wrap',marginBottom:8},
  sortBtn:{paddingHorizontal:12,paddingVertical:7,borderRadius:99,borderWidth:1.5,borderColor:COLORS.border,backgroundColor:COLORS.bg2},
  sortBtnOn:{backgroundColor:COLORS.purple,borderColor:COLORS.purple},
  sortTxt:{fontSize:12,fontWeight:'600',color:COLORS.text2},
  searchRow:{flexDirection:'row',alignItems:'center',backgroundColor:COLORS.bg2,borderRadius:10,borderWidth:1,borderColor:COLORS.border,paddingHorizontal:10,paddingVertical:9},
  searchInput:{flex:1,fontSize:14,color:COLORS.text},
  officialBanner:{backgroundColor:'#EFF6FF',borderBottomWidth:0.5,borderBottomColor:'#BFDBFE',paddingHorizontal:14,paddingVertical:8,flexDirection:'row',gap:6,alignItems:'flex-start'},
  officialBannerTxt:{flex:1,fontSize:12,color:COLORS.primary,lineHeight:17},
  guestBanner:{backgroundColor:'#F3E8FF',borderBottomWidth:0.5,borderBottomColor:'#DDD6FE',paddingHorizontal:16,paddingVertical:9},
  guestTxt:{fontSize:13,color:'#6D28D9',fontWeight:'500',textAlign:'center'},
});

const ec = StyleSheet.create({
  card:{backgroundColor:COLORS.bg2,borderRadius:16,borderWidth:0.5,borderColor:COLORS.border,overflow:'hidden'},
  officialStripe:{backgroundColor:COLORS.primary,flexDirection:'row',alignItems:'center',gap:4,paddingHorizontal:12,paddingVertical:4},
  officialStripeTxt:{fontSize:11,fontWeight:'600',color:'#fff'},
  header:{flexDirection:'row'},
  dateBadge:{width:72,backgroundColor:COLORS.purpleLight,alignItems:'center',justifyContent:'center',padding:12},
  day:{fontSize:28,fontWeight:'800',color:COLORS.purple,lineHeight:30},
  month:{fontSize:10,fontWeight:'700',color:COLORS.purple,textTransform:'uppercase'},
  time:{fontSize:10,color:COLORS.purple,marginTop:2},
  todayBadge:{backgroundColor:COLORS.purple,borderRadius:4,paddingHorizontal:6,paddingVertical:1,marginTop:3},
  todayTxt:{fontSize:9,fontWeight:'800',color:'#fff'},
  info:{flex:1,padding:12},
  topRow:{flexDirection:'row',alignItems:'center',gap:6,marginBottom:4,flexWrap:'wrap'},
  catBadge:{backgroundColor:COLORS.purpleLight,borderRadius:99,paddingHorizontal:8,paddingVertical:2},
  catBadgeTxt:{fontSize:11,fontWeight:'600',color:COLORS.purple},
  freeBadge:{backgroundColor:COLORS.successLight,borderRadius:99,paddingHorizontal:8,paddingVertical:2},
  freeTxt:{fontSize:10,fontWeight:'800',color:COLORS.success},
  paidBadge:{backgroundColor:COLORS.warningLight,borderRadius:99,paddingHorizontal:8,paddingVertical:2},
  paidTxt:{fontSize:11,fontWeight:'600',color:COLORS.warning},
  title:{fontSize:15,fontWeight:'700',color:COLORS.text,lineHeight:20},
  venue:{fontSize:12,color:COLORS.text3,marginTop:3},
  desc:{fontSize:12,color:COLORS.text2,marginTop:4,lineHeight:16},
  footer:{flexDirection:'row',gap:6,padding:10,borderTopWidth:0.5,borderTopColor:COLORS.border,alignItems:'center'},
  navBtn:{flex:1,backgroundColor:COLORS.primary,borderRadius:99,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:4,paddingVertical:8},
  navBtnTxt:{fontSize:12,fontWeight:'600',color:'#fff'},
  ticketBtn:{backgroundColor:COLORS.purpleLight,borderRadius:99,flexDirection:'row',alignItems:'center',gap:4,paddingHorizontal:12,paddingVertical:8,borderWidth:1,borderColor:COLORS.purple},
  ticketBtnTxt:{fontSize:12,fontWeight:'600',color:COLORS.purple},
  voteBtn:{paddingHorizontal:10,paddingVertical:7,borderRadius:99,borderWidth:0.5,borderColor:COLORS.border,backgroundColor:COLORS.bg},
  voteTxt:{fontSize:13},
  source:{fontSize:10,color:COLORS.text3,flex:1,textAlign:'right'},
});

const em = StyleSheet.create({
  wrap:{alignItems:'center',paddingTop:60,paddingHorizontal:32,paddingBottom:40},
  icon:{fontSize:52,textAlign:'center',marginBottom:12},
  title:{fontSize:17,fontWeight:'700',color:COLORS.text,textAlign:'center',marginBottom:6},
  desc:{fontSize:13,color:COLORS.text2,textAlign:'center',lineHeight:20,marginBottom:20},
  btn:{backgroundColor:COLORS.purple,borderRadius:99,paddingHorizontal:24,paddingVertical:12,flexDirection:'row',alignItems:'center',gap:6},
  btnTxt:{color:'#fff',fontWeight:'700',fontSize:15},
  divider:{flexDirection:'row',alignItems:'center',gap:8,width:'100%',marginVertical:20},
  dividerLine:{flex:1,height:0.5,backgroundColor:COLORS.border},
  dividerTxt:{fontSize:11,color:COLORS.text3,fontStyle:'italic'},
  linksTitle:{fontSize:12,fontWeight:'600',color:COLORS.text3,alignSelf:'flex-start',marginBottom:8},
  linkBtn:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',width:'100%',backgroundColor:COLORS.bg2,borderRadius:10,paddingHorizontal:14,paddingVertical:12,marginBottom:6,borderWidth:0.5,borderColor:COLORS.border},
  linkTxt:{fontSize:13,color:COLORS.primary,fontWeight:'500'},
});

const am = StyleSheet.create({
  wrap:{flex:1,backgroundColor:COLORS.bg2},
  handle:{width:40,height:4,borderRadius:99,backgroundColor:COLORS.border,alignSelf:'center',marginTop:10},
  header:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',padding:16,borderBottomWidth:0.5,borderBottomColor:COLORS.border},
  title:{fontSize:18,fontWeight:'700',color:COLORS.text},
  closeBtn:{width:32,height:32,borderRadius:99,backgroundColor:COLORS.bg,alignItems:'center',justifyContent:'center'},
  form:{padding:16,paddingBottom:60},
  infoBanner:{flexDirection:'row',gap:8,backgroundColor:COLORS.primaryLight,borderRadius:12,padding:12,marginBottom:12,alignItems:'flex-start'},
  infoTxt:{flex:1,fontSize:12,color:COLORS.primary,lineHeight:17},
  label:{fontSize:13,fontWeight:'600',color:COLORS.text,marginBottom:5,marginTop:8},
  input:{backgroundColor:COLORS.bg,borderRadius:12,borderWidth:1.5,borderColor:COLORS.border,padding:12,fontSize:15,color:COLORS.text},
  catGrid:{flexDirection:'row',flexWrap:'wrap',gap:6,marginBottom:6},
  catBtn:{flexDirection:'row',alignItems:'center',gap:4,paddingHorizontal:10,paddingVertical:6,borderRadius:99,borderWidth:1.5,borderColor:COLORS.border,backgroundColor:COLORS.bg},
  catBtnOn:{backgroundColor:COLORS.purple,borderColor:COLORS.purple},
  catEmoji:{fontSize:13},catTxt:{fontSize:12,fontWeight:'500',color:COLORS.text2},
  gpsBtn:{flexDirection:'row',alignItems:'center',gap:8,backgroundColor:COLORS.primaryLight,borderRadius:12,padding:12,borderWidth:1,borderColor:COLORS.primary,marginVertical:6},
  gpsBtnOn:{backgroundColor:COLORS.successLight,borderColor:COLORS.success},
  gpsTxt:{fontSize:13,color:COLORS.primary,flex:1},
  freeToggle:{paddingHorizontal:12,paddingVertical:10,borderRadius:12,borderWidth:1.5,borderColor:COLORS.border,backgroundColor:COLORS.bg,marginBottom:0},
  freeToggleOn:{backgroundColor:COLORS.success,borderColor:COLORS.success},
  freeToggleTxt:{fontSize:12,fontWeight:'600',color:COLORS.text2},
  errBox:{backgroundColor:COLORS.dangerLight,borderRadius:10,padding:12,marginBottom:8},
  errTxt:{color:COLORS.danger,fontSize:13},
  submitBtn:{backgroundColor:COLORS.purple,borderRadius:99,padding:15,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:6,marginTop:8},
  submitTxt:{color:'#fff',fontWeight:'700',fontSize:15},
});
