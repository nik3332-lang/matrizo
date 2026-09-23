export type ProfessionalProject = {
  id: string;
  name: string;
  locality: string;
  address?: string;
  description: string;
  photos: string[];
};
export type Professional = {
  id: string;
  kind: "painter" | "plumber";
  name: string;
  yearsExperience: number;
  photoUrl: string;
  workPhotos: string[];
  projects?: ProfessionalProject[];
};
