import { useEffect, useState } from 'react'
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Button } from '../components/ui'
import { getServer } from '../lib/api'
import { useAuth } from '../lib/auth'
import { colors } from '../lib/theme'

export default function LoginScreen() {
  const { signIn } = useAuth()
  const [server, setServer] = useState('')
  const [showServer, setShowServer] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => { getServer().then(setServer) }, [])

  const submit = async () => {
    if (!email || !password) return setError('E-posta ve şifre girin.')
    setError('')
    setLoading(true)
    try {
      await signIn(server, email.trim(), password)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Giriş yapılamadı.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
          <Text style={s.brand}>YES LOJİSTİK</Text>
          <Text style={s.slogan}>Güvenle, Her Yere...</Text>
          <View style={s.card}>
            <Text style={s.title}>Giriş</Text>
            <Text style={s.label}>E-posta</Text>
            <TextInput style={s.input} value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email"
              keyboardType="email-address" placeholder="ornek@yeslojistik.com" accessibilityLabel="E-posta" />
            <Text style={s.label}>Şifre</Text>
            <TextInput style={s.input} value={password} onChangeText={setPassword} secureTextEntry autoComplete="password"
              accessibilityLabel="Şifre" onSubmitEditing={submit} />
            {showServer && (
              <>
                <Text style={s.label}>Sunucu adresi</Text>
                <TextInput style={s.input} value={server} onChangeText={setServer} autoCapitalize="none" keyboardType="url"
                  placeholder="https://yeslojistik.onrender.com" accessibilityLabel="Sunucu adresi" />
              </>
            )}
            {!!error && <Text style={s.error}>{error}</Text>}
            <Button title="Giriş Yap" onPress={submit} loading={loading} style={{ marginTop: 8 }} />
            <Pressable onPress={() => setShowServer((v) => !v)} style={{ marginTop: 14 }}>
              <Text style={s.link}>{showServer ? 'Sunucu ayarını gizle' : 'Sunucu ayarı'}</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.navy },
  container: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  brand: { color: '#fff', fontSize: 30, fontWeight: '900', fontStyle: 'italic', textAlign: 'center' },
  slogan: { color: '#bfdbfe', fontStyle: 'italic', textAlign: 'center', marginBottom: 24 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 20 },
  title: { fontSize: 20, fontWeight: '700', color: colors.navy, marginBottom: 12 },
  label: { color: colors.muted, fontSize: 14, marginTop: 10, marginBottom: 4 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12, fontSize: 17, color: colors.text },
  error: { color: colors.red, marginTop: 10, fontSize: 15 },
  link: { color: colors.brand, textAlign: 'center', fontSize: 14 },
})
