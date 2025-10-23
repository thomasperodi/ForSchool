'use client';

import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import Link from 'next/link';
import { SecretGroup } from '@/types/secret-santa';

function statusVariant(s: SecretGroup['status']) {
  switch (s) {
    case 'draft': return 'secondary';
    case 'locked': return 'outline';
    case 'drawn': return 'default';
    case 'closed': return 'destructive';
    default: return 'secondary';
  }
}

export function GroupCard({ g, onDelete }: { g: SecretGroup; onDelete?: (id: string) => void }) {
  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{g.name}</CardTitle>
          <Badge variant={statusVariant(g.status) as any}>{g.status}</Badge>
        </div>
        <div className="text-sm text-muted-foreground">
          Tipo: {g.type} • Budget: {g.budget ?? '—'} • Reveal: {g.reveal_at ? new Date(g.reveal_at).toLocaleDateString() : '—'}
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>Partecipanti</div>
          <div className="text-right">{g._meta?.participantsCount ?? 0}</div>
          <div>Accettati</div>
          <div className="text-right">{g._meta?.acceptedCount ?? 0}</div>
        </div>
        <Separator className="my-3" />
        <div className="text-xs text-muted-foreground">
          Wishlist: {g.allow_wishlist ? 'sì' : 'no'} • Esclusioni: {g.allow_exclusions ? 'sì' : 'no'}
        </div>
      </CardContent>
      <CardFooter className="flex gap-2">
        <Button asChild size="sm"><Link href={`/secret-santa/${g.id}`}>Apri</Link></Button>
        <Button asChild variant="outline" size="sm"><Link href={`/secret-santa/new?duplicate=${g.id}`}>Duplica</Link></Button>
        <div className="ml-auto">
          <Button variant="destructive" size="sm" onClick={() => onDelete?.(g.id)}>Elimina</Button>
        </div>
      </CardFooter>
    </Card>
  );
}
