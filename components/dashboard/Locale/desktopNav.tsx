import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

export const DesktopNav = () => {
  return (
    <Tabs defaultValue="overview">
      <TabsList>
        <TabsTrigger value="overview">Panoramica</TabsTrigger>
        <TabsTrigger value="promotions">Promozioni</TabsTrigger>
        <TabsTrigger value="customers">Clienti</TabsTrigger>
        {/* Add more TabsTrigger as needed */}
      </TabsList>
    </Tabs>
  );
};