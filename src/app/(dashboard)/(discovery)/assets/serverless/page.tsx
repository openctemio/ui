import { redirect } from 'next/navigation'

export default function ServerlessPage() {
  redirect('/assets/hosts?sub_type=serverless')
}
