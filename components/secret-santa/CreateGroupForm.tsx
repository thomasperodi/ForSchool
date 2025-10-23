'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiGet, apiPost } from '@/lib/secretSantaApi';
import { SecretGroup, SecretGroupType } from '@/types/secret-santa';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';

type DupData = Partial<SecretGroup> & { rules?: string; message?: string };

export default function CreateGroupForm() {
  const router = useRouter();
  const sp = useSearchParams();
  const dupId = sp.get('duplicate');

  const [loading, setLoading] = useState(false);
  const [prefill, setPrefill] = useState<DupData | null>(null);

  const [name, setName] = useState('');
  const [type, setType] = useState<SecretGroupType>('classe');
  const [budget, setBudget] = useState<number | ''>('');
  const [reveal, setReveal] = useState<string>('');
  const [allowWishlist, setAllowWishlist] = useState(true);
  const [allowExclusions, setAllowExclusions] = useState(true);
  const [message, setMessage] = useState('');
  const [rules, setRules] = useState('');

  useEffect(() => {
    (async () => {
      if (!dupId) return;
      try {
        const d = await apiGet<DupData>(`/api/secret-santa/groups/${dupId}`);
        setPrefill(d);
        setName((d.name ?? '') + ' (copia)');
        if (d.type) setType(d.type);
        if (d.budget != null) setBudget(Number(d.budget));
        if (d.reveal_at) setReveal(d.reveal_at.slice(0, 10));
        setAllowWishlist(d.allow_wishlist ?? true);
        setAllowExclusions(d.allow_exclusions ?? true);
      } catch { /* ignore */ }
    })();
  }, [dupId]);

  const canSubmit = useMemo(() => name.trim().length >= 3, [name]);

  const onSubmit = async () => {
    setLoading(true);
    try {
      const payload = {
        name,
        type,
        budget: budget === '' ? null : Number(budget),
        reveal_at: reveal ? new Date(reveal).toISOString() : null,
        allow_wishlist: allowWishlist,
        allow_exclusions: allowExclusions,
        message,
        rules,
      };
      const created = await apiPost<SecretGroup>('/api/secret-santa/groups', payload);
      router.push(`/secret-santa/${created.id}`);
    } catch (e: any) {
      alert(e?.message ?? 'Errore creazione gruppo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Crea gruppo Secret Santa</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2">
          <Label>Nome</Label>
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="Es. 5B Informatica 2025" />
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label>Tipo</Label>
            <Select value={type} onValueChange={v => setType(v as SecretGroupType)}>
              <SelectTrigger><SelectValue placeholder="Seleziona tipo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="classe">Classe</SelectItem>
                <SelectItem value="custom">Personalizzato</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Budget (€)</Label>
            <Input inputMode="decimal" value={budget} onChange={e => setBudget(e.target.value === '' ? '' : Number(e.target.value))} placeholder="Es. 15" />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label>Data reveal</Label>
            <Input type="date" value={reveal} onChange={e => setReveal(e.target.value)} min={format(new Date(), 'yyyy-MM-dd')} />
          </div>
          <div className="grid gap-2">
            <Label className="flex items-center justify-between">
              Consenti wishlist
              <Switch checked={allowWishlist} onCheckedChange={setAllowWishlist} />
            </Label>
            <Label className="flex items-center justify-between">
              Consenti esclusioni
              <Switch checked={allowExclusions} onCheckedChange={setAllowExclusions} />
            </Label>
          </div>
        </div>

        <div className="grid gap-2">
          <Label>Messaggio (facoltativo)</Label>
          <Textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Messaggio di benvenuto al gruppo..." />
        </div>

        <div className="grid gap-2">
          <Label>Regole (facoltativo)</Label>
          <Textarea value={rules} onChange={e => setRules(e.target.value)} placeholder="Regole del Secret Santa..." />
        </div>
      </CardContent>
      <CardFooter className="justify-end gap-2">
        <Button variant="outline" onClick={() => history.back()}>Annulla</Button>
        <Button onClick={onSubmit} disabled={!canSubmit || loading}>{loading ? 'Creazione…' : 'Crea gruppo'}</Button>
      </CardFooter>
    </Card>
  );
}
