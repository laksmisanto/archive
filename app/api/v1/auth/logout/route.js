import { ok } from '@/lib/utils/apiResponse';

export async function POST() {
  const response = ok({ message: 'Logged out' });
  response.cookies.set('nams_token', '', { httpOnly: true, maxAge: 0, path: '/' });
  return response;
}
