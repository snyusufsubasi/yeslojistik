import { Redirect } from 'expo-router'
import { useAuth } from '../lib/auth'

/** Açılış: hesabın rolüne göre şoför ya da ofis (yönetici) ekranlarına yönlendirir. */
export default function Index() {
  const { role } = useAuth()
  return <Redirect href={role === 'Driver' ? '/sofor' : '/yonetim'} />
}
