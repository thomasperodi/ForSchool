'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiPost } from '@/lib/secretSantaApi';

export function InviteDialog({ groupId, open, onOpenChange, onInvited }:{
  groupId: string; open: boolean; onOpenChange: (v:boolean)=>void; onInvited?: ()=>void;
}) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  async function send() {
    setLoading(true);
    try {
      await apiPost(`/api/secret-santa/groups/${groupId}/invite`, { email });
      onInvited?.();
      setEmail('');
      onOpenChange(false);
    } catch (e:any) {
      alert(e?.message ?? 'Errore invito');
    } finally { setLoading(false); }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invita tramite email</DialogTitle>
        </DialogHeader>
        <div className="grid gap-2">
          <Input placeholder="email@esempio.com" value={email} onChange={e=>setEmail(e.target.value)} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={()=>onOpenChange(false)}>Annulla</Button>
          <Button onClick={send} disabled={!email || loading}>{loading?'Invio…':'Invita'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
