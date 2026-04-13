import { redirect } from 'next/navigation'

export default function Page() {
  redirect('/assets/services?sub_type=open_port')
}
