import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../utils';

export default function PrivacyScreen({ onClose }) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg2 }} edges={['top']}>
      <View style={s.header}>
        <Text style={s.title}>Política de Privacidad</Text>
        {onClose && (
          <TouchableOpacity onPress={onClose} style={s.closeBtn}>
            <Ionicons name="close" size={20} color={COLORS.text2}/>
          </TouchableOpacity>
        )}
      </View>
      <ScrollView contentContainerStyle={s.body}>
        <Text style={s.updated}>Última actualización: marzo 2025</Text>

        <Text style={s.h2}>1. Quién somos</Text>
        <Text style={s.p}>PreciMap es una aplicación de ahorro y comparación de precios. El responsable del tratamiento es el desarrollador de PreciMap.</Text>

        <Text style={s.h2}>2. Datos que recogemos</Text>
        <Text style={s.p}>• Email y nombre de usuario al registrarte{'\n'}• Precios de productos que reportas voluntariamente{'\n'}• Ubicación aproximada (solo cuando abres el mapa, nunca en segundo plano){'\n'}• Fotos que subes voluntariamente al publicar chollos</Text>

        <Text style={s.h2}>3. Para qué usamos tus datos</Text>
        <Text style={s.p}>• Gestionar tu cuenta y autenticación{'\n'}• Mostrar tu actividad en el ranking comunitario{'\n'}• Enviarte notificaciones sobre tus reportes (en la app, no push){'\n'}• Mejorar la app con datos agregados y anónimos</Text>

        <Text style={s.h2}>4. Tus derechos (RGPD)</Text>
        <Text style={s.p}>Tienes derecho a acceder, rectificar y eliminar tus datos en cualquier momento desde Perfil → Zona Peligrosa → Eliminar mi cuenta. Tu cuenta se elimina permanentemente en 24 horas.</Text>

        <Text style={s.h2}>5. Compartición de datos</Text>
        <Text style={s.p}>No vendemos ni compartimos tus datos con terceros. Los precios reportados son públicos por naturaleza (son el producto principal de la app). Tu email nunca es público.</Text>

        <Text style={s.h2}>6. Cookies y almacenamiento</Text>
        <Text style={s.p}>Solo almacenamos tu sesión localmente en tu dispositivo (AsyncStorage). No usamos cookies de terceros ni rastreo publicitario.</Text>

        <Text style={s.h2}>7. Contacto</Text>
        <Text style={s.p}>Para cualquier consulta sobre privacidad, escríbenos a:</Text>
        <TouchableOpacity onPress={() => Linking.openURL('mailto:privacidad@precimap.app')}>
          <Text style={s.link}>privacidad@precimap.app</Text>
        </TouchableOpacity>

        <Text style={s.h2}>8. Cambios en esta política</Text>
        <Text style={s.p}>Te notificaremos en la app si hay cambios materiales en esta política de privacidad.</Text>

        <View style={{height:1,backgroundColor:COLORS.border,marginVertical:28}}/>

        <Text style={{fontSize:18,fontWeight:'800',color:COLORS.text,marginBottom:6}}>Términos de Uso</Text>
        <Text style={s.updated}>En vigor desde: marzo 2025</Text>

        <Text style={s.h2}>1. Aceptación</Text>
        <Text style={s.p}>Al usar PreciMap aceptas estos términos. El uso de la app implica la aceptación de estas condiciones y de la Política de Privacidad.</Text>

        <Text style={s.h2}>2. Uso permitido</Text>
        <Text style={s.p}>PreciMap es una herramienta de comparación de precios para uso personal. Queda prohibido usar la app para fines comerciales, scraping automatizado o publicación masiva de precios falsos.</Text>

        <Text style={s.h2}>3. Contenido del usuario</Text>
        <Text style={s.p}>Al publicar precios, chollos o eventos, garantizas que la información es veraz y actual. PreciMap puede eliminar contenido incorrecto o inapropiado sin previo aviso.</Text>

        <Text style={s.h2}>4. Exactitud de datos</Text>
        <Text style={s.p}>Los precios son aportados por la comunidad y el Ministerio de Energía. PreciMap no garantiza su exactitud. Verifica siempre el precio en el establecimiento antes de comprar.</Text>

        <Text style={s.h2}>5. Limitación de responsabilidad</Text>
        <Text style={s.p}>PreciMap no se hace responsable de decisiones económicas tomadas basándose en los datos de la app. Los precios de bancos y productos financieros pueden cambiar sin previo aviso.</Text>

        <Text style={s.h2}>6. Propiedad intelectual</Text>
        <Text style={s.p}>El código y diseño de PreciMap son propiedad de sus desarrolladores. Los datos de gasolineras son del Ministerio para la Transición Ecológica (datos abiertos).</Text>

        <View style={{ height: 40 }}/>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 0.5, borderBottomColor: COLORS.border },
  title:  { fontSize: 17, fontWeight: '700', color: COLORS.text },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.bg3, alignItems: 'center', justifyContent: 'center' },
  body:   { padding: 20, paddingBottom: 60 },
  updated:{ fontSize: 11, color: COLORS.text3, marginBottom: 20, fontStyle: 'italic' },
  h2:     { fontSize: 15, fontWeight: '700', color: COLORS.text, marginTop: 20, marginBottom: 8 },
  p:      { fontSize: 14, color: COLORS.text2, lineHeight: 22 },
  link:   { fontSize: 14, color: COLORS.primary, textDecorationLine: 'underline', marginTop: 4 },
});
