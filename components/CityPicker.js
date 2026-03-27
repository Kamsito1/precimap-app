import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, Modal, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, apiGet } from '../utils';

export default function CityPicker({ value, onChange, placeholder = 'Toda España' }) {
  const [visible, setVisible] = useState(false);
  const [query, setQuery]     = useState('');
  const [results, setResults] = useState({ cities: [], provinces: [] });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) loadCities();
  }, [visible]);

  useEffect(() => {
    const t = setTimeout(() => loadCities(), 300);
    return () => clearTimeout(t);
  }, [query]);

  async function loadCities() {
    setLoading(true);
    try {
      const r = await apiGet(`/api/cities?q=${encodeURIComponent(query)}`);
      setResults(r);
    } catch(_) {}
    finally { setLoading(false); }
  }

  function select(city) {
    onChange(city);
    setVisible(false);
    setQuery('');
  }

  const combined = [
    ...results.provinces.map(p => ({ label: p, type: 'province' })),
    ...results.cities.map(c => ({ label: c, type: 'city' })),
  ].filter((v, i, a) => a.findIndex(x => x.label === v.label) === i).slice(0, 40);

  return (
    <>
      <TouchableOpacity style={s.trigger} onPress={() => setVisible(true)}>
        <Ionicons name="location-outline" size={14} color={value ? COLORS.primary : COLORS.text3}/>
        <Text style={[s.triggerTxt, value && {color:COLORS.primary,fontWeight:'600'}]}>{value || placeholder}</Text>
        {value ? (
          <TouchableOpacity onPress={() => onChange('')}>
            <Ionicons name="close-circle" size={16} color={COLORS.text3}/>
          </TouchableOpacity>
        ) : <Ionicons name="chevron-down-outline" size={14} color={COLORS.text3}/>}
      </TouchableOpacity>

      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setVisible(false)}>
        <View style={s.modal}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>📍 Seleccionar ubicación</Text>
            <TouchableOpacity onPress={() => setVisible(false)} style={s.closeBtn}>
              <Ionicons name="close" size={20} color={COLORS.text2}/>
            </TouchableOpacity>
          </View>

          <View style={s.searchBox}>
            <Ionicons name="search-outline" size={16} color={COLORS.text3} style={{marginRight:8}}/>
            <TextInput style={s.searchInput} placeholder="Buscar ciudad o provincia..." value={query}
              onChangeText={setQuery} autoFocus placeholderTextColor={COLORS.text3}/>
            {query ? <TouchableOpacity onPress={() => setQuery('')}><Ionicons name="close-circle" size={16} color={COLORS.text3}/></TouchableOpacity> : null}
          </View>

          {/* "Toda España" option */}
          <TouchableOpacity style={s.allSpainBtn} onPress={() => { onChange(''); setVisible(false); }}>
            <Text style={s.allSpainEmoji}>🇪🇸</Text>
            <View>
              <Text style={s.allSpainTxt}>Toda España</Text>
              <Text style={s.allSpainSub}>Sin filtro de ubicación</Text>
            </View>
            {!value && <Ionicons name="checkmark-circle" size={20} color={COLORS.success} style={{marginLeft:'auto'}}/>}
          </TouchableOpacity>

          <FlatList
            data={combined}
            keyExtractor={(item,i) => `${item.type}-${i}`}
            renderItem={({item}) => (
              <TouchableOpacity style={s.item} onPress={() => select(item.label)}>
                <Ionicons
                  name={item.type==='province' ? 'map-outline' : 'location-outline'}
                  size={16} color={item.type==='province' ? COLORS.purple : COLORS.primary}
                  style={{marginRight:10}}
                />
                <View style={{flex:1}}>
                  <Text style={s.itemLabel}>{item.label}</Text>
                  <Text style={s.itemType}>{item.type==='province' ? 'Provincia' : 'Ciudad'}</Text>
                </View>
                {value === item.label && <Ionicons name="checkmark-circle" size={18} color={COLORS.success}/>}
              </TouchableOpacity>
            )}
            ListHeaderComponent={loading ? (
              <View style={{paddingVertical:20,alignItems:'center',flexDirection:'row',justifyContent:'center',gap:8}}>
                <ActivityIndicator size="small" color={COLORS.primary}/>
                <Text style={{fontSize:13,color:COLORS.text3}}>Buscando...</Text>
              </View>
            ) : null}
            ListEmptyComponent={!loading ? <Text style={s.empty}>No se encontraron resultados</Text> : null}
            contentContainerStyle={{paddingBottom:40}}
          />
        </View>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  trigger:{flexDirection:'row',alignItems:'center',gap:6,backgroundColor:COLORS.bg2,borderRadius:12,borderWidth:1.5,borderColor:COLORS.border,paddingHorizontal:12,paddingVertical:9},
  triggerTxt:{flex:1,fontSize:14,color:COLORS.text3},
  modal:{flex:1,backgroundColor:COLORS.bg2},
  modalHeader:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',padding:16,borderBottomWidth:0.5,borderBottomColor:COLORS.border},
  modalTitle:{fontSize:17,fontWeight:'700',color:COLORS.text},
  closeBtn:{width:32,height:32,borderRadius:99,backgroundColor:COLORS.bg,alignItems:'center',justifyContent:'center'},
  searchBox:{flexDirection:'row',alignItems:'center',backgroundColor:COLORS.bg,margin:12,borderRadius:12,borderWidth:1,borderColor:COLORS.border,paddingHorizontal:12,paddingVertical:10},
  searchInput:{flex:1,fontSize:15,color:COLORS.text},
  allSpainBtn:{flexDirection:'row',alignItems:'center',gap:12,paddingHorizontal:16,paddingVertical:14,borderBottomWidth:1,borderBottomColor:COLORS.border,backgroundColor:COLORS.primaryLight},
  allSpainEmoji:{fontSize:24},
  allSpainTxt:{fontSize:15,fontWeight:'700',color:COLORS.primary},
  allSpainSub:{fontSize:12,color:COLORS.text3},
  item:{flexDirection:'row',alignItems:'center',paddingHorizontal:16,paddingVertical:14,borderBottomWidth:0.5,borderBottomColor:COLORS.border},
  itemLabel:{fontSize:15,fontWeight:'500',color:COLORS.text},
  itemType:{fontSize:11,color:COLORS.text3,marginTop:1},
  empty:{textAlign:'center',color:COLORS.text3,padding:30},
});
