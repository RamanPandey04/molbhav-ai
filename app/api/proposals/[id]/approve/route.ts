import { decide } from '@/lib/api/proposal-decision';
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return decide(request,(await params).id,'APPROVED');
}
