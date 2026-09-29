import { FlatList, StyleSheet, Text, View } from 'react-native'
import { Button, Card } from '../../components/ui'
import { confirm } from '../../lib/dialog'
import { processQueue, removeItem, retryItem, useOutbox } from '../../lib/outbox'
import { colors } from '../../lib/theme'

/** Henüz ofise ulaşmamış işlemler: tekrar deneme ve (onayla) silme. */
export default function PendingScreen() {
  const items = useOutbox()
  return (
    <FlatList
      style={{ flex: 1, backgroundColor: colors.bg }}
      data={items}
      keyExtractor={(i) => i.id}
      contentContainerStyle={{ padding: 16, gap: 10 }}
      ListHeaderComponent={items.length > 0 ? <Button title="Hepsini Şimdi Gönder" onPress={() => processQueue(true)} style={{ marginBottom: 6 }} /> : null}
      ListEmptyComponent={<Text style={s.empty}>Bekleyen işlem yok. Her şey ofise ulaştı.</Text>}
      renderItem={({ item }) => (
        <Card style={{ gap: 6 }}>
          <Text style={s.title}>{item.label}</Text>
          <Text style={s.meta}>Sefer #{item.tripId} · {new Date(item.createdAt).toLocaleString('tr-TR')}</Text>
          {item.lastError && <Text style={[s.meta, { color: item.failed ? colors.red : colors.amber }]}>{item.failed ? 'Gönderilemedi: ' : 'Son deneme: '}{item.lastError}</Text>}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Button title="Tekrar dene" variant="outline" onPress={() => retryItem(item.id)} style={{ flex: 1 }} />
            <Button title="Sil" variant="outline" color={colors.red} style={{ flex: 1 }}
              onPress={() => confirm('İşlemi sil', `"${item.label}" ofise gönderilmeden silinecek. Emin misiniz?`, () => { removeItem(item.id) })} />
          </View>
        </Card>
      )}
    />
  )
}

const s = StyleSheet.create({
  title: { fontSize: 16, fontWeight: '700', color: colors.navy },
  meta: { fontSize: 13, color: colors.muted },
  empty: { textAlign: 'center', color: colors.muted, marginTop: 40, fontSize: 16 },
})
