import React, { useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, Dimensions, FlatList, StyleSheet,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '../utils';

const { width, height } = Dimensions.get('window');

const SLIDES = [
  {
    emoji: '🔍',
    title: 'Encuentra lo más barato',
    desc: 'Compara precios de gasolineras, supermercados, cafeterías, farmacias y más cerca de ti.',
    bg: '#2563EB',
  },
  {
    emoji: '🔥',
    title: 'Chollos y ofertas exclusivas',
    desc: 'Descubre las mejores ofertas de internet. Comparte tus chollos con enlace de referido y gana dinero.',
    bg: '#DC2626',
  },
  {
    emoji: '🎭',
    title: 'Eventos cerca de ti',
    desc: 'Conciertos, ferias, exposiciones, deporte... Encuentra qué hacer en tu ciudad y provincia.',
    bg: '#7C3AED',
  },
  {
    emoji: '💰',
    title: 'Ahorra +100€ al mes',
    desc: 'Gasolina, supermercados, gimnasios, bancos... Todo comparado para que pagues menos cada mes.',
    bg: '#16A34A',
  },
];

export default function OnboardingSlider({ onFinish }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef(null);

  const goNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
    } else {
      AsyncStorage.setItem('onboarding_done', '1');
      onFinish();
    }
  };

  const skip = () => {
    AsyncStorage.setItem('onboarding_done', '1');
    onFinish();
  };

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) setCurrentIndex(viewableItems[0].index || 0);
  }).current;

  const renderSlide = ({ item }) => (
    <View style={[s.slide, { backgroundColor: item.bg }]}>  
      <Text style={s.emoji}>{item.emoji}</Text>
      <Text style={s.title}>{item.title}</Text>
      <Text style={s.desc}>{item.desc}</Text>
    </View>
  );

  return (
    <View style={s.container}>
      <FlatList
        ref={flatListRef}
        data={SLIDES}
        renderItem={renderSlide}
        keyExtractor={(_, i) => String(i)}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ viewAreaCoveragePercentThreshold: 50 }}
        bounces={false}
      />

      {/* Dots */}
      <View style={s.dotsRow}>
        {SLIDES.map((_, i) => (
          <View key={i} style={[s.dot, i === currentIndex && s.dotActive]} />
        ))}
      </View>

      {/* Buttons */}
      <View style={s.btnRow}>
        {currentIndex < SLIDES.length - 1 ? (
          <TouchableOpacity onPress={skip}>
            <Text style={s.skipTxt}>Saltar</Text>
          </TouchableOpacity>
        ) : <View />}
        <TouchableOpacity style={s.nextBtn} onPress={goNext}>
          <Text style={s.nextTxt}>
            {currentIndex === SLIDES.length - 1 ? '¡Empezar!' : 'Siguiente'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  slide: { width, height, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  emoji: { fontSize: 80, marginBottom: 24 },
  title: { fontSize: 28, fontWeight: '800', color: '#fff', textAlign: 'center', marginBottom: 16, letterSpacing: -0.5 },
  desc: { fontSize: 16, color: 'rgba(255,255,255,0.85)', textAlign: 'center', lineHeight: 24 },
  dotsRow: { position: 'absolute', bottom: 120, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.4)' },
  dotActive: { width: 24, backgroundColor: '#fff' },
  btnRow: { position: 'absolute', bottom: 50, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 30 },
  skipTxt: { fontSize: 16, color: 'rgba(255,255,255,0.7)', fontWeight: '600' },
  nextBtn: { backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 99, paddingHorizontal: 28, paddingVertical: 14, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.5)' },
  nextTxt: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
