import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, Image, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, apiGet } from '../utils';
import { useAuth } from '../contexts/AuthContext';

const PERIODS = [
  { key:'week',  label:'Esta semana', emoji:'📅' },
  { key:'month', label:'Este mes',    emoji:'🗓️' },
  { key:'all',   label:'Histórico',   emoji:'🏆' },
];

export default function RankingScreen() {
  const { user, isLoggedIn } = useAuth();
  const [leaders, setLeaders] = useState([]);
  const [period, setPeriod]   = useState('month');
  const [stats, setStats]     = useState(null);
  const [myRank, setMyRank]   = useState(null);
  const [mainTab, setMainTab] = useState('ranking'); // 'ranking' | 'comunidad'
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [serverLevels, setServerLevels] = useState(null);

  useEffect(() => { load(); }, [period]);
  useEffect(() => {
    apiGet('/api/levels').then(d => { if (d?.levels) setServerLevels(d); }).catch(() => {});
  }, []);

  async function load() {
    try {
      const [lb, st] = await Promise.all([
        apiGet(`/api/leaderboard?period=${period}`),
        apiGet('/api/stats'),
      ]);
      setLeaders(lb || []);
      setStats(st);
      // Check if logged-in user is in top 30
      if (isLoggedIn && user) {
        const inTop = (lb || []).some(u => u.id === user.id);
        if (!inTop) {
          // Get user's rank
          const me = await apiGet('/api/users/me').catch(() => null);
          if (me) setMyRank({ points: me.points || 0, reports: me.stats?.reports || 0 });
        } else {
          setMyRank(null);
        }
      }
    } catch {} finally { setLoading(false); setRefreshing(false); }
  }

  const onRefresh = useCallback(() => { setRefreshing(true); load(); }, [period]);
  const initials = (name = '?') => name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  const MEDAL_COLOR = ['#F59E0B', '#94A3B8', '#B45309'];
  const MEDAL_BG    = ['#FFFBEB', '#F8FAFC', '#FEF3C7'];
  const PODIUM_HEIGHT = [1, 0.82, 0.72]; // relative heights for visual podium effect
  const MEDAL_EMOJI = ['🥇', '🥈', '🥉'];

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <Text style={s.title}>🏆 Ranking</Text>
        <Text style={s.sub}>Los mejores ahorradores de España</Text>

        {/* Global stats */}
        {stats && (
          <View style={s.statsRow}>
            {[
              [stats.users || 0,       '👤 Usuarios'],
              [stats.prices || 0,      '💰 Precios'],
              [stats.deals || 0,       '🔥 Chollos'],
              [Number(stats.gasolineras||0).toLocaleString('es-ES')+'+', '⛽ Gasolinas'],
            ].map(([n, l]) => (
              <View key={l} style={s.statBox}>
                <Text style={s.statN}>{typeof n==='number' ? Number(n).toLocaleString('es-ES') : n}</Text>
                <Text style={s.statL}>{l}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Main tab selector */}
        <View style={{flexDirection:'row',paddingHorizontal:12,paddingBottom:8,gap:8}}>
          {[['ranking','🏆 Ranking'],['comunidad','🌍 Comunidad']].map(([key,label])=>(
            <TouchableOpacity key={key}
              style={{flex:1,paddingVertical:9,borderRadius:12,alignItems:'center',
                backgroundColor:mainTab===key?COLORS.primary:COLORS.bg3,
                borderWidth:1.5,borderColor:mainTab===key?COLORS.primary:COLORS.border}}
              onPress={()=>setMainTab(key)}>
              <Text style={{fontSize:13,fontWeight:'700',color:mainTab===key?'#fff':COLORS.text2}}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Period selector */}
        <View style={[s.periodRow, {display: mainTab==='ranking'?'flex':'none'}]}>
          {PERIODS.map(p => (
            <TouchableOpacity key={p.key}
              style={[s.periodBtn, period === p.key && s.periodBtnOn]}
              onPress={() => setPeriod(p.key)}>
              <Text style={s.periodEmoji}>{p.emoji}</Text>
              <Text style={[s.periodTxt, period === p.key && { color: '#fff', fontWeight: '700' }]}>{p.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Tab: Comunidad */}
      {mainTab === 'comunidad' && (
        <ScrollView contentContainerStyle={{padding:16,gap:12,paddingBottom:100}}>
          {!stats ? <ActivityIndicator color={COLORS.primary} style={{marginTop:40}}/> : (<>
          <Text style={{fontSize:13,color:COLORS.text3,marginBottom:4}}>Estadísticas de la comunidad PreciMap</Text>
          {[
            ['⛽', Number(stats?.gasolineras||12213).toLocaleString('es-ES')+'+', 'Gasolineras indexadas','Del Ministerio de Energía (RITE)'],
            ['👤', String(stats.users||0), 'Usuarios activos','Ahorradores registrados'],
            ['💰', String(stats.prices||0), 'Precios reportados','Por la comunidad en el mapa'],
            ['🔥', String(stats.deals||0), 'Chollos publicados','Ofertas verificadas'],
            ['📅', String(stats.events||0), 'Eventos locales','En 9+ ciudades de España'],
            ['📊', String(stats.price_history||300), 'Registros históricos','Evolución de precios en el tiempo'],
            ['📍', String(stats.places||0), 'Lugares en el mapa','Supermercados, farmacias, restaurantes y más'],
          ].map(([emoji, num, label, desc]) => (
            <View key={label} style={{backgroundColor:COLORS.bg2,borderRadius:14,padding:14,flexDirection:'row',alignItems:'center',gap:14,borderWidth:1,borderColor:COLORS.border}}>
              <Text style={{fontSize:28}}>{emoji}</Text>
              <View style={{flex:1}}>
                <Text style={{fontSize:22,fontWeight:'800',color:COLORS.primary}}>{num}</Text>
                <Text style={{fontSize:13,fontWeight:'700',color:COLORS.text}}>{label}</Text>
                <Text style={{fontSize:11,color:COLORS.text3,marginTop:1}}>{desc}</Text>
              </View>
            </View>
          ))}
          {/* Gas price stats */}
          {stats.gas_stats?.g95 && (
            <View style={{backgroundColor:COLORS.bg2,borderRadius:14,padding:14,borderWidth:1,borderColor:COLORS.border}}>
              <Text style={{fontSize:14,fontWeight:'700',color:COLORS.text,marginBottom:10}}>⛽ Precios G95 en España ahora</Text>
              {[['🟢 Mínimo',stats.gas_stats.g95.min],['📊 Media',stats.gas_stats.g95.avg],['🔴 Máximo',stats.gas_stats.g95.max]].map(([l,v])=>(
                <View key={l} style={{flexDirection:'row',justifyContent:'space-between',paddingVertical:4}}>
                  <Text style={{fontSize:13,color:COLORS.text2}}>{l}</Text>
                  <Text style={{fontSize:13,fontWeight:'700',color:COLORS.text}}>{v?.toFixed(3)}€/L</Text>
                </View>
              ))}
            </View>
          )}
          {/* Levels from server */}
          {(serverLevels?.levels || [
            {min:0,   title:'Novato',    emoji:'🌱', color:'#6B7280', perks:['Ver el mapa','Ver chollos']},
            {min:50,  title:'Ahorrador', emoji:'💰', color:'#16A34A', perks:['Reportar precios','Votar chollos']},
            {min:150, title:'Experto',   emoji:'⭐', color:'#D97706', perks:['Publicar chollos','Añadir lugares','Proponer cambios de precio']},
            {min:400, title:'Gurú',      emoji:'🏆', color:'#DC2626', perks:['Badge dorado','Prioridad en verificaciones']},
            {min:1000,title:'Leyenda',   emoji:'👑', color:'#7C3AED', perks:['Perfil leyenda permanente','Top ranking nacional']},
          ]).map(lvl => (
            <View key={lvl.title} style={{backgroundColor:COLORS.bg2,borderRadius:12,padding:12,borderWidth:1,borderColor:COLORS.border,borderLeftWidth:4,borderLeftColor:lvl.color||COLORS.primary}}>
              <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:6}}>
                <Text style={{fontSize:16,fontWeight:'800',color:lvl.color||COLORS.primary}}>{lvl.emoji} {lvl.title}</Text>
                <Text style={{fontSize:11,color:COLORS.text3,fontWeight:'600'}}>{lvl.min}+ pts</Text>
              </View>
              {(lvl.perks||[]).map(p=>(
                <Text key={p} style={{fontSize:12,color:COLORS.text2,marginTop:2}}>✓ {p}</Text>
              ))}
            </View>
          ))}
          </>)}
        </ScrollView>
      )}

      {/* Tab: Ranking */}
      {mainTab !== 'comunidad' && (
        loading
          ? <ActivityIndicator color={COLORS.primary} style={{ marginTop: 50 }}/>
          : <FlatList
            data={leaders}
            keyExtractor={u => String(u.id)}
            contentContainerStyle={{ padding: 12, gap: 8, paddingBottom: 100 }}
            ListHeaderComponent={leaders.length > 0 && leaders[0]?.period_fallback && period !== 'all' ? (
              <View style={{backgroundColor:'#FEF3C7',borderRadius:12,padding:12,marginBottom:8,flexDirection:'row',gap:8,alignItems:'center'}}>
                <Text style={{fontSize:18}}>📅</Text>
                <View style={{flex:1}}>
                  <Text style={{fontSize:13,fontWeight:'700',color:'#92400E'}}>
                    Sin actividad esta {period === 'week' ? 'semana' : 'mes'}
                  </Text>
                  <Text style={{fontSize:11,color:'#B45309',marginTop:2}}>
                    Reporta precios para aparecer en el ranking semanal · mostrando histórico
                  </Text>
                </View>
              </View>
            ) : null}
            ListFooterComponent={myRank ? (
              <View style={s.myRankBanner}>
                <Text style={s.myRankEmoji}>
                  {(myRank.points||0)>=1000?'👑':(myRank.points||0)>=400?'🏆':(myRank.points||0)>=150?'⭐':(myRank.points||0)>=50?'💰':'🌱'}
                </Text>
                <View style={{flex:1}}>
                  <Text style={s.myRankTitle}>
                    {(myRank.points||0)>=1000?'Leyenda':(myRank.points||0)>=400?'Gurú':(myRank.points||0)>=150?'Experto':(myRank.points||0)>=50?'Ahorrador':'Novato'} · Tu posición
                  </Text>
                  <Text style={s.myRankSub}>{myRank.points || 0} pts · {myRank.reports || 0} {(myRank.reports||0) === 1 ? 'reporte' : 'reportes'}</Text>
                </View>
                <Text style={s.myRankHint}>Sigue reportando precios{'\n'}para entrar en el top 30</Text>
              </View>
            ) : null}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary}/>}
            ListHeaderComponent={leaders.length > 0 ? (
              <View style={s.podium}>
                {leaders.slice(0, 3).map((u, i) => (
                  <View key={u.id} style={[s.podiumCard,
                    { backgroundColor: MEDAL_BG[i], borderColor: MEDAL_COLOR[i] + '44' },
                    i === 0 && { transform: [{ scale: 1.06 }], zIndex: 2, elevation: 4 },
                  ]}>
                    <Text style={s.podiumMedal}>{MEDAL_EMOJI[i]}</Text>
                    {u.avatar_url
                      ? <Image source={{ uri: u.avatar_url }} style={[s.podiumAvatar, { borderColor: MEDAL_COLOR[i] }]}/>
                      : (
                        <View style={[s.podiumAvatar, { backgroundColor: MEDAL_COLOR[i] + '33', alignItems: 'center', justifyContent: 'center', borderColor: MEDAL_COLOR[i] }]}>
                          <Text style={[s.podiumInitials, { color: MEDAL_COLOR[i] }]}>{initials(u.name)}</Text>
                        </View>
                      )
                    }
                    <Text style={s.podiumName} numberOfLines={1}>
                      {u.name?.split(' ')[0]}{user && u.id === user.id ? ' 👈 tú' : ''}
                    </Text>
                    <Text style={[s.podiumPts, { color: MEDAL_COLOR[i] }]}>{u.points || 0} pts</Text>
                    <Text style={s.podiumReports}>{u.reports || 0} {(u.reports||0)===1?'reporte':'reportes'}</Text>
                  </View>
                ))}
              </View>
            ) : null}
            renderItem={({ item: u, index: i }) => {
              if (i < 3) return null;
              const progress = Math.min(100, (u.reports || 0) * 4);
              const isMe = user && u.id === user.id;
              return (
                <View style={[s.row, isMe && { borderColor: COLORS.primary, borderWidth: 1.5, backgroundColor: COLORS.primaryLight }]}>
                  <Text style={[s.rowNum, isMe && { color: COLORS.primary }]}>#{i + 1}</Text>
                  {u.avatar_url
                    ? <Image source={{ uri: u.avatar_url }} style={s.rowAvatar}/>
                    : (
                      <View style={s.rowAvatarFallback}>
                        <Text style={s.rowAvatarTxt}>{initials(u.name)}</Text>
                      </View>
                    )
                  }
                  <View style={s.rowInfo}>
                    <View style={{flexDirection:'row',alignItems:'center',gap:6}}>
                      <Text style={s.rowName}>{u.name}</Text>
                      {isMe && <View style={{backgroundColor:COLORS.primary,borderRadius:99,paddingHorizontal:6,paddingVertical:2}}><Text style={{fontSize:9,fontWeight:'800',color:'#fff'}}>TÚ</Text></View>}
                    </View>
                    <View style={s.rowMeta}>
                      <Text style={s.rowMetaTxt}>📍 {u.reports || 0} {(u.reports||0)===1?'reporte':'reportes'}</Text>
                      {(u.streak || 0) > 0 && <Text style={s.rowMetaTxt}>🔥 {u.streak}d</Text>}
                      {u.rank_title && <Text style={{fontSize:10,color:COLORS.primary,fontWeight:'700'}}>{u.rank_title}</Text>}
                    </View>
                    <View style={s.progressBg}>
                      <View style={[s.progressFill, { width: `${progress}%` }]}/>
                    </View>
                  </View>
                  <View style={s.rowPts}>
                    <Text style={s.rowPtsN}>{u.points || 0}</Text>
                    <Text style={s.rowPtsL}>pts</Text>
                  </View>
                </View>
              );
            }}
            ListEmptyComponent={
              <View style={s.empty}>
                <Text style={{ fontSize: 52, textAlign: 'center', marginBottom: 12 }}>🚀</Text>
                <Text style={s.emptyTitle}>¡Sé el primero!</Text>
                <Text style={s.emptyDesc}>Reporta precios en el mapa o publica chollos para aparecer en el ranking.</Text>
              </View>
            }
          />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  header: { backgroundColor: COLORS.bg2, borderBottomWidth: 0.5, borderBottomColor: COLORS.border },
  title: { fontSize: 22, fontWeight: '700', color: COLORS.text, paddingHorizontal: 16, paddingTop: 14 },
  sub: { fontSize: 12, color: COLORS.text3, paddingHorizontal: 16, marginTop: 2, marginBottom: 12 },
  statsRow: { flexDirection: 'row', paddingHorizontal: 12, gap: 6, marginBottom: 12 },
  statBox: { flex: 1, backgroundColor: COLORS.bg, borderRadius: 12, padding: 10, alignItems: 'center', borderWidth: 0.5, borderColor: COLORS.border },
  statN: { fontSize: 16, fontWeight: '800', color: COLORS.primary },
  statL: { fontSize: 9, color: COLORS.text3, marginTop: 2, textAlign: 'center' },
  periodRow: { flexDirection: 'row', paddingHorizontal: 12, paddingBottom: 12, gap: 6 },
  periodBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 9, borderRadius: 12, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.bg },
  periodBtnOn: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  periodEmoji: { fontSize: 13 },
  periodTxt: { fontSize: 12, fontWeight: '500', color: COLORS.text2 },
  podium: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  podiumCard: { flex: 1, borderRadius: 16, padding: 12, alignItems: 'center', gap: 4, borderWidth: 1.5 },
  podiumMedal: { fontSize: 28 },
  podiumAvatar: { width: 46, height: 46, borderRadius: 23, borderWidth: 2 },
  podiumInitials: { fontSize: 16, fontWeight: '800' },
  podiumName: { fontSize: 12, fontWeight: '700', color: COLORS.text, textAlign: 'center' },
  podiumPts: { fontSize: 14, fontWeight: '800' },
  podiumReports: { fontSize: 10, color: COLORS.text3 },
  row: { backgroundColor: COLORS.bg2, borderRadius: 14, borderWidth: 0.5, borderColor: COLORS.border, flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10 },
  rowNum: { fontSize: 14, fontWeight: '700', color: COLORS.text3, minWidth: 26, textAlign: 'center' },
  rowAvatar: { width: 42, height: 42, borderRadius: 21 },
  rowAvatarFallback: { width: 42, height: 42, borderRadius: 21, backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center' },
  rowAvatarTxt: { fontSize: 15, fontWeight: '800', color: COLORS.primary },
  rowInfo: { flex: 1 },
  rowName: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  rowMeta: { flexDirection: 'row', gap: 10, marginTop: 2 },
  rowMetaTxt: { fontSize: 11, color: COLORS.text3 },
  progressBg: { height: 4, backgroundColor: COLORS.border, borderRadius: 99, marginTop: 6, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 99 },
  rowPts: { alignItems: 'flex-end' },
  rowPtsN: { fontSize: 20, fontWeight: '800', color: COLORS.primary },
  rowPtsL: { fontSize: 10, color: COLORS.text3 },
  empty: { alignItems: 'center', paddingTop: 50, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginBottom: 6 },
  emptyDesc: { fontSize: 14, color: COLORS.text2, textAlign: 'center', lineHeight: 21 },
  myRankBanner: { flexDirection:'row', alignItems:'center', gap:12, backgroundColor:COLORS.primaryLight, borderRadius:16, padding:16, borderWidth:1, borderColor:COLORS.primary+'44', marginTop:8 },
  myRankEmoji: { fontSize:32 },
  myRankTitle: { fontSize:14, fontWeight:'700', color:COLORS.primary },
  myRankSub: { fontSize:12, color:COLORS.text2, marginTop:2 },
  myRankHint: { fontSize:11, color:COLORS.text3, textAlign:'right', lineHeight:16 },
});
