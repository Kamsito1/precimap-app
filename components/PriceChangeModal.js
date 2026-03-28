import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Modal, StyleSheet,
  FlatList, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, apiGet, apiPost, timeAgo } from '../utils';
import { useAuth } from '../contexts/AuthContext';

export default function PriceChangeModal({ visible, onClose, place, product = null, initialProduct = null }) {
  const { isLoggedIn, user } = useAuth();
  const [tab, setTab] = useState('changes'); // 'changes' | 'propose'
  const [changes, setChanges] = useState([]);
  const [loading, setLoading] = useState(false);
  const [voting, setVoting] = useState({});
  const [newProduct, setNewProduct] = useState(product || '');
  const [newPrice, setNewPrice] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible && place) loadChanges();
    const prod = initialProduct || product;
    if (prod) { setNewProduct(prod); setTab('propose'); }
    else setTab('changes');
  }, [visible, place]);

  async function loadChanges() {
    setLoading(true);
    try {
      const data = await apiGet(`/api/places/${place.id}/price-changes`);
      setChanges(Array.isArray(data) ? data : []);
    } catch(_) {}
    setLoading(false);
  }

  async function vote(changeId, v) {
    if (!isLoggedIn) { Alert.alert('Inicia sesión', 'Para votar necesitas una cuenta.'); return; }
    setVoting(x => ({ ...x, [changeId]: true }));
    try {
      const res = await apiPost(`/api/price-changes/${changeId}/vote`, { vote: v });
      if (res.ok) {
        setChanges(prev => prev.map(c => c.id === changeId
          ? { ...c, votes_up: res.votes_up, votes_down: res.votes_down, status: res.status }
          : c));
        if (res.status === 'approved') Alert.alert('✅ Aprobado', '¡La comunidad ha validado este precio!');
      } else {
        Alert.alert('Aviso', res.error || 'Ya has votado esta solicitud');
      }
    } catch(_) {}
    setVoting(x => ({ ...x, [changeId]: false }));
  }

  async function propose() {
    if (!isLoggedIn) { Alert.alert('Inicia sesión', 'Para reportar precios necesitas una cuenta.'); return; }
    if (!newProduct.trim() || !newPrice.trim()) { Alert.alert('Faltan datos', 'Introduce el producto y el precio.'); return; }
    const price = parseFloat(newPrice.replace(',', '.'));
    if (isNaN(price) || price <= 0) { Alert.alert('Precio inválido', 'Introduce un precio numérico válido (ej: 1.20).'); return; }
    if (price > 500) { Alert.alert('Precio inválido', 'El precio parece demasiado alto. Compruébalo.'); return; }
    setSubmitting(true);
    try {
      // Usar POST /api/prices para reporte directo (se guarda en BD inmediatamente)
      const res = await apiPost('/api/prices', {
        place_id: place?.id,
        product: newProduct.trim(),
        price: price,
        unit: 'unidad',
      });
      if (res?.id || res?.place_id) {
        Alert.alert('✅ ¡Gracias!', `Precio de ${newProduct.trim()} (${price.toFixed(2)}€) guardado. +10 puntos.`);
        setNewPrice(''); setNewProduct(''); setReason('');
        setTab('changes'); loadChanges();
        onClose?.();
      } else {
        Alert.alert('Error', res?.error || 'No se pudo guardar el precio');
      }
    } catch (e) { Alert.alert('Error', e.message); }
    setSubmitting(false);
  }

  function ChangeCard({ c }) {
    const net = (c.votes_up || 0) - (c.votes_down || 0);
    const isApproved = c.status === 'approved';
    const isRejected = c.status === 'rejected';
    return (
      <View style={[ss.card, isApproved && ss.cardApproved, isRejected && ss.cardRejected]}>
        <View style={ss.cardTop}>
          <View style={{ flex: 1 }}>
            <Text style={ss.product} numberOfLines={1}>{c.product}</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 3 }}>
              {c.old_price != null && <Text style={ss.oldPrice}>{c.old_price?.toFixed(2)}€ antes</Text>}
              <Text style={ss.newPrice}>→ {c.new_price?.toFixed(2)}€</Text>
            </View>
            {c.reason && <Text style={ss.reason} numberOfLines={2}>{c.reason}</Text>}
          </View>
          <View style={ss.statusBadge}>
            <Text style={[ss.statusTxt, isApproved && { color: '#16A34A' }, isRejected && { color: '#DC2626' }]}>
              {isApproved ? '✅ Aprobado' : isRejected ? '❌ Rechazado' : '⏳ Votando'}
            </Text>
          </View>
        </View>
        <View style={ss.cardBot}>
          <Text style={ss.meta}>
            {c.users?.name?.split(' ')[0] || 'Usuario'} · {timeAgo(c.created_at)}
          </Text>
          {!isApproved && !isRejected && (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity style={[ss.voteBtn, ss.voteBtnUp]} onPress={() => vote(c.id, 1)} disabled={!!voting[c.id]}>
                {voting[c.id] ? <ActivityIndicator size="small" color="#fff" /> : (
                  <Text style={ss.voteBtnTxt}>👍 {c.votes_up || 0}</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity style={[ss.voteBtn, ss.voteBtnDown]} onPress={() => vote(c.id, -1)} disabled={!!voting[c.id]}>
                <Text style={ss.voteBtnTxt}>👎 {c.votes_down || 0}</Text>
              </TouchableOpacity>
              <Text style={ss.netVotes}>Neto: {net > 0 ? '+' : ''}{net} / 5</Text>
            </View>
          )}
        </View>
      </View>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={ss.safe} edges={['top']}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          {/* Header */}
          <View style={ss.header}>
            <TouchableOpacity onPress={onClose} style={ss.closeBtn}>
              <Ionicons name="close" size={22} color={COLORS.text} />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={ss.title}>💰 Precios en {place?.name?.slice(0, 25)}</Text>
              <Text style={ss.sub}>La comunidad verifica y aprueba los cambios</Text>
            </View>
          </View>
          {/* Tabs */}
          <View style={ss.tabs}>
            {[['changes','📋 Solicitudes'],['propose','➕ Proponer']].map(([k,l]) => (
              <TouchableOpacity key={k} style={[ss.tab, tab===k&&ss.tabOn]} onPress={() => setTab(k)}>
                <Text style={[ss.tabTxt, tab===k&&ss.tabTxtOn]}>{l}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {tab === 'changes' ? (
            loading ? <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} /> :
            changes.length === 0 ? (
              <View style={ss.empty}>
                <Text style={{ fontSize: 40 }}>📋</Text>
                <Text style={ss.emptyTxt}>Sin solicitudes pendientes</Text>
                <Text style={ss.emptySub}>Sé el primero en proponer un precio actualizado</Text>
                <TouchableOpacity style={ss.emptyBtn} onPress={() => setTab('propose')}>
                  <Text style={{ color: '#fff', fontWeight: '700' }}>Proponer cambio</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <FlatList data={changes} keyExtractor={c => String(c.id)}
                contentContainerStyle={{ padding: 12, gap: 10, paddingBottom: 40 }}
                renderItem={({ item: c }) => <ChangeCard c={c} />} />
            )
          ) : (
            <ScrollView style={{ flex: 1 }} contentContainerStyle={ss.form}>
              <Text style={ss.label}>Producto / Servicio</Text>
              <TextInput style={ss.input} value={newProduct} onChangeText={setNewProduct}
                placeholder="ej. Paracetamol 1g, Menú del día..." placeholderTextColor={COLORS.text3} />
              <Text style={ss.label}>Nuevo precio (€)</Text>
              <TextInput style={ss.input} value={newPrice} onChangeText={setNewPrice}
                placeholder="ej. 1.89" keyboardType="decimal-pad" placeholderTextColor={COLORS.text3} />
              <Text style={ss.label}>Motivo (opcional)</Text>
              <TextInput style={[ss.input, { height: 70 }]} value={reason} onChangeText={setReason}
                placeholder="ej. Lo compré hoy y el precio ha bajado" multiline
                placeholderTextColor={COLORS.text3} />
              <View style={ss.infoBox}>
                <Text style={ss.infoTxt}>⚡ Tu precio se guarda directamente en la BD. La comunidad puede votar para verificarlo y dar puntos al reportador.</Text>
              </View>
              <TouchableOpacity style={[ss.submitBtn, submitting && { opacity: 0.6 }]} onPress={propose} disabled={submitting}>
                {submitting ? <ActivityIndicator color="#fff" /> : <Text style={ss.submitTxt}>Enviar propuesta</Text>}
              </TouchableOpacity>
            </ScrollView>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const ss = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: COLORS.bg },
  header:      { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16, borderBottomWidth: 0.5, borderBottomColor: COLORS.border, backgroundColor: COLORS.bg2 },
  closeBtn:    { padding: 4 },
  title:       { fontSize: 16, fontWeight: '700', color: COLORS.text },
  sub:         { fontSize: 11, color: COLORS.text3, marginTop: 1 },
  tabs:        { flexDirection: 'row', padding: 12, gap: 8 },
  tab:         { flex: 1, paddingVertical: 9, borderRadius: 10, alignItems: 'center', backgroundColor: COLORS.bg3, borderWidth: 1.5, borderColor: COLORS.border },
  tabOn:       { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  tabTxt:      { fontSize: 13, fontWeight: '600', color: COLORS.text2 },
  tabTxtOn:    { color: '#fff' },
  card:        { backgroundColor: COLORS.bg2, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: COLORS.border },
  cardApproved:{ borderColor: '#16A34A', backgroundColor: '#F0FDF4' },
  cardRejected:{ borderColor: '#DC2626', backgroundColor: '#FEF2F2', opacity: 0.7 },
  cardTop:     { flexDirection: 'row', gap: 10, marginBottom: 8 },
  product:     { fontSize: 14, fontWeight: '700', color: COLORS.text },
  oldPrice:    { fontSize: 12, color: COLORS.text3, textDecorationLine: 'line-through' },
  newPrice:    { fontSize: 13, fontWeight: '800', color: COLORS.primary },
  reason:      { fontSize: 11, color: COLORS.text2, marginTop: 4, fontStyle: 'italic' },
  statusBadge: { alignItems: 'flex-end' },
  statusTxt:   { fontSize: 11, fontWeight: '700', color: COLORS.text3 },
  cardBot:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  meta:        { fontSize: 11, color: COLORS.text3 },
  voteBtn:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 99, gap: 4 },
  voteBtnUp:   { backgroundColor: '#16A34A' },
  voteBtnDown: { backgroundColor: '#DC2626' },
  voteBtnTxt:  { fontSize: 12, fontWeight: '700', color: '#fff' },
  netVotes:    { fontSize: 11, color: COLORS.text3, alignSelf: 'center' },
  empty:       { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 10 },
  emptyTxt:    { fontSize: 16, fontWeight: '700', color: COLORS.text },
  emptySub:    { fontSize: 13, color: COLORS.text2, textAlign: 'center' },
  emptyBtn:    { backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 99, marginTop: 8 },
  form:        { padding: 16, gap: 6, paddingBottom: 60 },
  label:       { fontSize: 13, fontWeight: '600', color: COLORS.text, marginTop: 8 },
  input:       { backgroundColor: COLORS.bg2, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: COLORS.text },
  infoBox:     { backgroundColor: COLORS.primaryLight, borderRadius: 10, padding: 12, marginTop: 8 },
  infoTxt:     { fontSize: 12, color: COLORS.primaryDark, lineHeight: 18 },
  submitBtn:   { backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 16 },
  submitTxt:   { color: '#fff', fontWeight: '700', fontSize: 16 },
});
