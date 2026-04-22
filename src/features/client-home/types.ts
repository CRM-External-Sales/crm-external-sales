export type CatalogTourImage = {
  path: string;
  alt: string | null;
  is_cover?: boolean;
};

export type CatalogTour = {
  id_tour: number;
  name: string;
  type: string;
  duration: string;
  base_price: number;
  description: string;
  tour_image: CatalogTourImage[];
};
