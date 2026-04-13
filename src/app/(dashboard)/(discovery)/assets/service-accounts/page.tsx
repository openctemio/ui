import { redirect } from 'next/navigation'

export default function Page() {
  redirect('/assets/identity?sub_type=service_account')
}
