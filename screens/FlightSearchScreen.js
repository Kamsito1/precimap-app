import React, { useState, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, Linking, Platform, Alert, Modal,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, openURL } from '../utils';

// Popular airport codes and names
const AIRPORTS = [
  { code:'MAD', name:'Madrid Barajas',       city:'Madrid',    country:'España' },
  { code:'BCN', name:'Barcelona El Prat',    city:'Barcelona', country:'España' },
  { code:'AGP', name:'Málaga',               city:'Málaga',    country:'España' },
  { code:'PMI', name:'Palma de Mallorca',    city:'Palma',     country:'España' },
  { code:'ALC', name:'Alicante',             city:'Alicante',  country:'España' },
  { code:'BIO', name:'Bilbao',               city:'Bilbao',    country:'España' },
  { code:'SVQ', name:'Sevilla',              city:'Sevilla',   country:'España' },
  { code:'VLC', name:'Valencia',             city:'Valencia',  country:'España' },
  { code:'TFN', name:'Tenerife Norte',       city:'Tenerife',  country:'España' },
  { code:'LPA', name:'Gran Canaria',         city:'Las Palmas',country:'España' },
  { code:'SDR', name:'Santander',            city:'Santander', country:'España' },
  { code:'ZAZ', name:'Zaragoza',             city:'Zaragoza',  country:'España' },
  { code:'OVD', name:'Asturias',             city:'Oviedo',    country:'España' },
  { code:'SCQ', name:'Santiago de Compostela',city:'Santiago', country:'España' },
  { code:'GRX', name:'Granada',              city:'Granada',   country:'España' },
  { code:'REC', name:'Murcia',               city:'Murcia',    country:'España' },
  { code:'XRY', name:'Jerez de la Frontera', city:'Jerez',     country:'España' },
  { code:'COR', name:'Córdoba',              city:'Córdoba',   country:'España' },
  { code:'MJV', name:'Región de Murcia Int.',city:'Murcia',    country:'España' },
  // Europe
  { code:'LHR', name:'London Heathrow',      city:'Londres',   country:'UK'     },
  { code:'CDG', name:'Paris Charles de Gaulle',city:'París',   country:'Francia'},
  { code:'FCO', name:'Roma Fiumicino',       city:'Roma',      country:'Italia' },
  { code:'AMS', name:'Amsterdam Schiphol',   city:'Ámsterdam', country:'Holanda'},
  { code:'FRA', name:'Frankfurt',            city:'Frankfurt', country:'Alemania'},
  { code:'LIS', name:'Lisboa',               city:'Lisboa',    country:'Portugal'},
  { code:'DUB', name:'Dublín',               city:'Dublín',    country:'Irlanda'},
  { code:'ATH', name:'Atenas',               city:'Atenas',    country:'Grecia' },
  { code:'MXP', name:'Milán Malpensa',       city:'Milán',     country:'Italia' },
  { code:'BER', name:'Berlín',               city:'Berlín',    country:'Alemania'},
  { code:'VIE', name:'Viena',                city:'Viena',     country:'Austria'},
  { code:'PRG', name:'Praga',                city:'Praga',     country:'R.Checa'},
  { code:'WAW', name:'Varsovia',             city:'Varsovia',  country:'Polonia'},
  { code:'BUD', name:'Budapest',             city:'Budapest',  country:'Hungría'},
  // Long haul
  { code:'JFK', name:'New York JFK',         city:'Nueva York',country:'EEUU'   },
  { code:'MIA', name:'Miami',                city:'Miami',     country:'EEUU'   },
  { code:'CUN', name:'Cancún',               city:'Cancún',    country:'México' },
  { code:'BOG', name:'Bogotá',               city:'Bogotá',    country:'Colombia'},
  { code:'EZE', name:'Buenos Aires',         city:'Bs.Aires',  country:'Argentina'},
  { code:'GRU', name:'São Paulo',            city:'São Paulo', country:'Brasil' },
  { code:'DXB', name:'Dubái',               city:'Dubái',     country:'EAU'    },
  { code:'BKK', name:'Bangkok',             city:'Bangkok',   country:'Tailandia'},
  { code:'TYO', name:'Tokio',               city:'Tokio',     country:'Japón'  },
  { code:'CMN', name:'Marrakech',            city:'Marrakech', country:'Marruecos'},
];

// Search engines with their URL patterns
const SEARCH_ENGINES = [
  {
    name: 'Skyscanner', emoji: '🔵', color: '#0770E3', bg: '#EFF6FF',
    desc: 'El más popular. Compara todas las aerolíneas',
    url: (origin, dest, date, ret, adults) =>
      `https://www.skyscanner.es/transporte/vuelos/${origin.toLowerCase()}/${dest.toLowerCase()}/${date?.replace(/-/g,'')}/${ret?.replace(/-/g,'')||''}/?adults=${adults}&cabinclass=economy`,
  },
  {
    name: 'Google Flights', emoji: '🔴', color: '#EA4335', bg: '#FEF2F2',
    desc: 'Búsqueda potente con calendario de precios',
    url: (origin, dest, date, ret, adults) =>
      `https://www.google.com/flights?hl=es#flt=${origin}.${dest}.${date}${ret?'*'+dest+'.'+origin+'.'+ret:''};c:EUR;e:1;sd:1;t:f`,
  },
  {
    name: 'Kayak', emoji: '🟡', color: '#F59E0B', bg: '#FFFBEB',
    desc: 'Alertas de precios y predicciones',
    url: (origin, dest, date, ret, adults) =>
      `https://www.kayak.es/flights/${origin}-${dest}/${date}${ret?'/'+ret:''}/${adults}adults`,
  },
  {
    name: 'Ryanair', emoji: '🟠', color: '#F97316', bg: '#FFF7ED',
    desc: 'El más barato para Europa. Sin intermediarios',
    url: (origin, dest, date, ret, adults) =>
      `https://www.ryanair.com/es/es/vuelos-baratos/${origin}/${dest}?adults=${adults}`,
  },
  {
    name: 'Iberia', emoji: '🔴', color: '#DC2626', bg: '#FEF2F2',
    desc: 'Aerolínea nacional. Mejor para largo radio',
    url: (origin, dest, date, ret, adults) =>
      `https://www.iberia.com/es/flights/?origin=${origin}&destination=${dest}&departDate=${date}&returnDate=${ret||''}&adults=${adults}`,
  },
  {
    name: 'Vueling', emoji: '🟡', color: '#EAB308', bg: '#FEFCE8',
    desc: 'Low cost española. Muchas rutas nacionales',
    url: (origin, dest, date, ret, adults) =>
      `https://www.vueling.com/es/vuelos/${origin}/${dest}?outbound=${date}&inbound=${ret||''}&passengers=${adults}`,
  },
];

const TIPS = [
  { emoji:'📅', title:'Martes y miércoles', desc:'Los días más baratos para volar en Europa. Evita viernes y domingos.' },
  { emoji:'⏰', title:'Reserva con antelación', desc:'Para vuelos nacionales: 4-6 semanas. Internacionales: 2-4 meses.' },
  { emoji:'🌍', title:'Activa alertas', desc:'Guarda la búsqueda en Skyscanner y recibe email cuando baje el precio.' },
  { emoji:'✈️', title:'Aeropuertos alternativos', desc:'Desde Madrid puedes volar desde Barajas o Getafe. Compara ambos.' },
  { emoji:'🧳', title:'Sin facturar', desc:'Solo con equipaje de mano en Ryanair/Vueling puede ser 30-50€ más barato.' },
  { emoji:'🔄', title:'Vuelta flexible', desc:'Si puedes volver un día antes o después, a veces el precio baja el doble.' },
];

function AirportPicker({ visible, onClose, onSelect, label }) {
  const [q, setQ] = useState('');
  const filtered = q.trim().length < 1
    ? AIRPORTS.slice(0,20)
    : AIRPORTS.filter(a =>
        a.code.toLowerCase().includes(q.toLowerCase()) ||
        a.city.toLowerCase().includes(q.toLowerCase()) ||
        a.name.toLowerCase().includes(q.toLowerCase()) ||
        a.country.toLowerCase().includes(q.toLowerCase())
      ).slice(0,20);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{flex:1,backgroundColor:COLORS.bg}} edges={['top']}>
        <View style={{flexDirection:'row',alignItems:'center',gap:10,padding:16,borderBottomWidth:0.5,borderBottomColor:COLORS.border}}>
          <TouchableOpacity onPress={onClose}><Ionicons name="close" size={22} color={COLORS.text}/></TouchableOpacity>
          <Text style={{fontSize:16,fontWeight:'700',color:COLORS.text,flex:1}}>✈️ {label}</Text>
        </View>
        <View style={{flexDirection:'row',alignItems:'center',backgroundColor:COLORS.bg2,margin:12,borderRadius:10,paddingHorizontal:12,gap:8,borderWidth:1,borderColor:COLORS.border}}>
          <Ionicons name="search-outline" size={16} color={COLORS.text3}/>
          <TextInput style={{flex:1,fontSize:14,color:COLORS.text,height:40}} value={q} onChangeText={setQ}
            placeholder="Ciudad, aeropuerto o código IATA..." placeholderTextColor={COLORS.text3} autoFocus/>
          {q ? <TouchableOpacity onPress={()=>setQ('')}><Ionicons name="close-circle" size={16} color={COLORS.text3}/></TouchableOpacity> : null}
        </View>
        <ScrollView contentContainerStyle={{paddingBottom:40}}>
          {filtered.map(a => (
            <TouchableOpacity key={a.code} style={{flexDirection:'row',alignItems:'center',padding:16,borderBottomWidth:0.5,borderBottomColor:COLORS.border,gap:12}} onPress={() => { onSelect(a); onClose(); setQ(''); }}>
              <View style={{width:48,height:48,borderRadius:12,backgroundColor:COLORS.primaryLight,alignItems:'center',justifyContent:'center'}}>
                <Text style={{fontSize:13,fontWeight:'800',color:COLORS.primary}}>{a.code}</Text>
              </View>
              <View style={{flex:1}}>
                <Text style={{fontSize:14,fontWeight:'700',color:COLORS.text}}>{a.city}</Text>
                <Text style={{fontSize:12,color:COLORS.text3,marginTop:1}}>{a.name} · {a.country}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={COLORS.text3}/>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

export default function FlightSearchScreen({ embedded = false }) {
  const Wrapper = embedded ? View : SafeAreaView;
  const wrapperProps = embedded ? {style:{flex:1,backgroundColor:COLORS.bg}} : {style:ss.safe, edges:['top']};

  // Default dates: tomorrow + 7 days
  const _tomorrow = new Date(Date.now() + 86400000);
  const _return   = new Date(Date.now() + 8 * 86400000);
  const _fmt = d => `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;

  const [origin,  setOrigin]  = useState(AIRPORTS[0]); // MAD
  const [dest,    setDest]    = useState(null);
  const [depDate, setDepDate] = useState(_fmt(_tomorrow));
  const [retDate, setRetDate] = useState(_fmt(_return));
  const [adults,  setAdults]  = useState(1);
  const [tripType, setTripType] = useState('round'); // 'one' | 'round'
  const [picker,  setPicker]  = useState(null); // 'origin' | 'dest'

  function formatDateInput(val) {
    // Auto-format as DD/MM/YYYY
    const nums = val.replace(/\D/g,'');
    if (nums.length <= 2) return nums;
    if (nums.length <= 4) return nums.slice(0,2)+'/'+nums.slice(2);
    return nums.slice(0,2)+'/'+nums.slice(2,4)+'/'+nums.slice(4,8);
  }
  function toISODate(val) {
    // Convert DD/MM/YYYY to YYYY-MM-DD
    const parts = val.split('/');
    if (parts.length !== 3 || parts[2].length !== 4) return null;
    return `${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`;
  }

  function openEngine(engine) {
    if (!dest) { Alert.alert('Destino requerido','Elige a dónde quieres volar'); return; }
    const depISO = toISODate(depDate);
    if (!depISO) { Alert.alert('Fecha inválida','Introduce la fecha en formato DD/MM/AAAA'); return; }
    const retISO = tripType === 'round' ? toISODate(retDate) : null;
    if (tripType === 'round' && !retISO) { Alert.alert('Fecha de vuelta','Introduce la fecha de vuelta en formato DD/MM/AAAA'); return; }
    const url = engine.url(origin.code, dest.code, depISO, retISO, adults);
    openURL(url);
  }

  const today = new Date();
  const todayStr = `${String(today.getDate()).padStart(2,'0')}/${String(today.getMonth()+1).padStart(2,'0')}/${today.getFullYear()}`;

  return (
    <Wrapper {...wrapperProps}>
      {!embedded && (
        <View style={ss.header}>
          <Text style={ss.title}>✈️ Buscar Vuelos</Text>
          <Text style={ss.sub}>Compara en todos los buscadores y aerolíneas</Text>
        </View>
      )}
      <ScrollView contentContainerStyle={{padding:12,gap:12,paddingBottom:100}} showsVerticalScrollIndicator={false}>

        {/* Trip type selector */}
        <View style={ss.tripTypeRow}>
          {[['round','🔄 Ida y vuelta'],['one','→ Solo ida']].map(([k,l]) => (
            <TouchableOpacity key={k} style={[ss.tripTypeBtn, tripType===k && ss.tripTypeBtnOn]} onPress={() => setTripType(k)}>
              <Text style={[ss.tripTypeTxt, tripType===k && {color:'#fff'}]}>{l}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Origin + Destination */}
        <View style={ss.routeCard}>
          <TouchableOpacity style={ss.airportRow} onPress={() => setPicker('origin')}>
            <View style={ss.airportIcon}><Text style={{fontSize:11,fontWeight:'800',color:COLORS.primary}}>{origin.code}</Text></View>
            <View style={{flex:1}}>
              <Text style={ss.airportLabel}>Origen</Text>
              <Text style={ss.airportCity}>{origin.city}</Text>
              <Text style={ss.airportName} numberOfLines={1}>{origin.name}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={COLORS.text3}/>
          </TouchableOpacity>
          <View style={ss.swapBtn}>
            <TouchableOpacity onPress={() => { if (dest) { const t = origin; setOrigin(dest); setDest(t); } }}
              style={{width:32,height:32,borderRadius:99,backgroundColor:COLORS.bg,borderWidth:1,borderColor:COLORS.border,alignItems:'center',justifyContent:'center'}}>
              <Ionicons name="swap-vertical" size={16} color={COLORS.primary}/>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={[ss.airportRow,{borderTopWidth:0.5,borderTopColor:COLORS.border}]} onPress={() => setPicker('dest')}>
            <View style={[ss.airportIcon,{backgroundColor: dest ? COLORS.primaryLight : COLORS.bg3}]}>
              {dest ? <Text style={{fontSize:11,fontWeight:'800',color:COLORS.primary}}>{dest.code}</Text>
                    : <Ionicons name="add" size={18} color={COLORS.text3}/>}
            </View>
            <View style={{flex:1}}>
              <Text style={ss.airportLabel}>Destino</Text>
              {dest ? <>
                <Text style={ss.airportCity}>{dest.city}</Text>
                <Text style={ss.airportName} numberOfLines={1}>{dest.name}</Text>
              </> : <Text style={[ss.airportCity,{color:COLORS.text3}]}>¿A dónde vas?</Text>}
            </View>
            <Ionicons name="chevron-forward" size={16} color={COLORS.text3}/>
          </TouchableOpacity>
        </View>

        {/* Dates */}
        <View style={ss.datesRow}>
          <View style={[ss.dateCard,{flex:1}]}>
            <Text style={ss.dateLabel}>🛫 Ida</Text>
            <TextInput style={ss.dateInput} value={depDate} placeholder={todayStr}
              onChangeText={v => setDepDate(formatDateInput(v))}
              keyboardType="number-pad" placeholderTextColor={COLORS.text3} maxLength={10}/>
            <Text style={ss.dateFmt}>DD/MM/AAAA</Text>
          </View>
          {tripType === 'round' && (
            <View style={[ss.dateCard,{flex:1}]}>
              <Text style={ss.dateLabel}>🛬 Vuelta</Text>
              <TextInput style={ss.dateInput} value={retDate} placeholder="Fecha vuelta"
                onChangeText={v => setRetDate(formatDateInput(v))}
                keyboardType="number-pad" placeholderTextColor={COLORS.text3} maxLength={10}/>
              <Text style={ss.dateFmt}>DD/MM/AAAA</Text>
            </View>
          )}
        </View>

        {/* Passengers */}
        <View style={ss.passCard}>
          <Text style={{fontSize:13,fontWeight:'700',color:COLORS.text}}>👥 Pasajeros</Text>
          <View style={{flexDirection:'row',alignItems:'center',gap:12}}>
            <TouchableOpacity onPress={() => setAdults(Math.max(1,adults-1))} style={ss.countBtn}>
              <Ionicons name="remove" size={18} color={COLORS.primary}/>
            </TouchableOpacity>
            <Text style={{fontSize:18,fontWeight:'800',color:COLORS.text,minWidth:24,textAlign:'center'}}>{adults}</Text>
            <TouchableOpacity onPress={() => setAdults(Math.min(9,adults+1))} style={ss.countBtn}>
              <Ionicons name="add" size={18} color={COLORS.primary}/>
            </TouchableOpacity>
            <Text style={{fontSize:12,color:COLORS.text3}}>adulto{adults>1?'s':''}</Text>
          </View>
        </View>

        {/* Search engines */}
        <Text style={ss.sectionTitle}>🔍 BUSCAR EN</Text>
        {SEARCH_ENGINES.map(engine => (
          <TouchableOpacity key={engine.name} style={[ss.engineCard,{borderColor:engine.color+'44'}]} onPress={() => openEngine(engine)} activeOpacity={0.8}>
            <View style={[ss.engineIcon,{backgroundColor:engine.bg}]}>
              <Text style={{fontSize:22}}>{engine.emoji}</Text>
            </View>
            <View style={{flex:1}}>
              <Text style={{fontSize:15,fontWeight:'700',color:COLORS.text}}>{engine.name}</Text>
              <Text style={{fontSize:12,color:COLORS.text3,marginTop:1}}>{engine.desc}</Text>
            </View>
            <View style={[ss.engineBtn,{backgroundColor:engine.color}]}>
              <Text style={{color:'#fff',fontWeight:'700',fontSize:12}}>Buscar</Text>
              <Ionicons name="open-outline" size={12} color="#fff"/>
            </View>
          </TouchableOpacity>
        ))}

        {/* Tips */}
        <Text style={[ss.sectionTitle,{marginTop:4}]}>💡 CONSEJOS PARA VOLAR BARATO</Text>
        {TIPS.map(t => (
          <View key={t.title} style={ss.tipCard}>
            <Text style={{fontSize:22,marginRight:10}}>{t.emoji}</Text>
            <View style={{flex:1}}>
              <Text style={{fontSize:13,fontWeight:'700',color:COLORS.text}}>{t.title}</Text>
              <Text style={{fontSize:12,color:COLORS.text3,marginTop:2,lineHeight:17}}>{t.desc}</Text>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Airport picker modals */}
      <AirportPicker visible={picker==='origin'} onClose={()=>setPicker(null)}
        label="Aeropuerto de origen" onSelect={a => setOrigin(a)}/>
      <AirportPicker visible={picker==='dest'} onClose={()=>setPicker(null)}
        label="Aeropuerto de destino" onSelect={a => setDest(a)}/>
    </Wrapper>
  );
}
const ss = StyleSheet.create({
  safe:        { flex:1, backgroundColor:COLORS.bg },
  header:      { backgroundColor:COLORS.primary, padding:16, paddingBottom:20 },
  title:       { fontSize:22, fontWeight:'800', color:'#fff' },
  sub:         { fontSize:13, color:'rgba(255,255,255,0.75)', marginTop:4 },
  tripTypeRow: { flexDirection:'row', gap:8 },
  tripTypeBtn: { flex:1, paddingVertical:10, borderRadius:12, alignItems:'center', backgroundColor:COLORS.bg2, borderWidth:1.5, borderColor:COLORS.border },
  tripTypeBtnOn:{ backgroundColor:COLORS.primary, borderColor:COLORS.primary },
  tripTypeTxt: { fontSize:13, fontWeight:'600', color:COLORS.text2 },
  routeCard:   { backgroundColor:COLORS.bg2, borderRadius:16, borderWidth:1, borderColor:COLORS.border, overflow:'hidden' },
  airportRow:  { flexDirection:'row', alignItems:'center', padding:14, gap:12 },
  airportIcon: { width:44, height:44, borderRadius:10, backgroundColor:COLORS.primaryLight, alignItems:'center', justifyContent:'center' },
  airportLabel:{ fontSize:10, fontWeight:'600', color:COLORS.text3, textTransform:'uppercase', letterSpacing:0.5 },
  airportCity: { fontSize:16, fontWeight:'700', color:COLORS.text, marginTop:1 },
  airportName: { fontSize:11, color:COLORS.text3, marginTop:1 },
  swapBtn:     { position:'absolute', right:14, top:'50%', zIndex:10 },
  datesRow:    { flexDirection:'row', gap:8 },
  dateCard:    { backgroundColor:COLORS.bg2, borderRadius:14, padding:12, borderWidth:1, borderColor:COLORS.border },
  dateLabel:   { fontSize:11, fontWeight:'700', color:COLORS.text3, marginBottom:4 },
  dateInput:   { fontSize:16, fontWeight:'600', color:COLORS.text },
  dateFmt:     { fontSize:9, color:COLORS.text3, marginTop:2 },
  passCard:    { flexDirection:'row', alignItems:'center', justifyContent:'space-between', backgroundColor:COLORS.bg2, borderRadius:14, padding:14, borderWidth:1, borderColor:COLORS.border },
  countBtn:    { width:32, height:32, borderRadius:99, backgroundColor:COLORS.primaryLight, alignItems:'center', justifyContent:'center' },
  sectionTitle:{ fontSize:11, fontWeight:'700', color:COLORS.text3, letterSpacing:0.5 },
  engineCard:  { flexDirection:'row', alignItems:'center', backgroundColor:COLORS.bg2, borderRadius:14, padding:12, borderWidth:1.5, gap:12 },
  engineIcon:  { width:48, height:48, borderRadius:12, alignItems:'center', justifyContent:'center' },
  engineBtn:   { flexDirection:'row', alignItems:'center', gap:4, paddingHorizontal:12, paddingVertical:8, borderRadius:99 },
  tipCard:     { flexDirection:'row', alignItems:'flex-start', backgroundColor:COLORS.bg2, borderRadius:12, padding:12, borderWidth:1, borderColor:COLORS.border },
});
