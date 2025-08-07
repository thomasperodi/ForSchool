// A simple dropdown menu component
import { useState } from 'react';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';

 export const  MobileNav = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div>
      <Button variant="ghost" onClick={() => setIsOpen(!isOpen)}>
        <Menu />
      </Button>
      {isOpen && (
        <div className="absolute top-16 left-0 w-full bg-background border-b shadow-lg z-50">
          {/* Your navigation links here */}
          <ul className="flex flex-col p-4 space-y-2">
            <li><a href="#" className="block p-2 hover:bg-muted rounded">Panoramica</a></li>
            <li><a href="#" className="block p-2 hover:bg-muted rounded">Promozioni</a></li>
            <li><a href="#" className="block p-2 hover:bg-muted rounded">Clienti</a></li>
            {/* Add more links as needed */}
          </ul>
        </div>
      )}
    </div>
  );
};