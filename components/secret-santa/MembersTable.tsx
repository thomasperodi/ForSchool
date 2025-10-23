'use client';

import { useMemo } from 'react';
import { GroupMember } from '@/types/secret-santa';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

export function MembersTable({ members, onResend, onRevoke }:{
  members: GroupMember[];
  onResend?: (m: GroupMember)=>void;
  onRevoke?: (m: GroupMember)=>void;
}) {
  const sorted = useMemo(()=> {
    return [...members].sort((a,b)=>{
      const order = { owner: 0, participant: 1 } as any;
      if (a.role !== b.role) return order[a.role]-order[b.role];
      const s = { accepted:0, invited:1, declined:2 } as any;
      return s[a.state]-s[b.state];
    });
  }, [members]);

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Email</TableHead>
          <TableHead>Ruolo</TableHead>
          <TableHead>Stato</TableHead>
          <TableHead className="text-right">Azioni</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sorted.map(m => (
          <TableRow key={m.id}>
            <TableCell className="font-medium">{m.email}</TableCell>
            <TableCell><Badge variant={m.role==='owner'?'default':'secondary'}>{m.role}</Badge></TableCell>
            <TableCell>
              <Badge variant={
                m.state==='accepted' ? 'default' :
                m.state==='invited' ? 'outline' : 'destructive'
              }>{m.state}</Badge>
            </TableCell>
            <TableCell className="text-right space-x-2">
              {m.state==='invited' && onResend && <Button size="sm" variant="outline" onClick={()=>onResend(m)}>Reinvita</Button>}
              {onRevoke && <Button size="sm" variant="destructive" onClick={()=>onRevoke(m)}>Revoca</Button>}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
