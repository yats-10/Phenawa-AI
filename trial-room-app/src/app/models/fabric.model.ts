export interface Fabric {
  id: string;
  userId: string;
  name: string;
  imageBase64: string;
  createdAt: string;
  interestedCount: number;
  orderedCount: number;
}

export interface CreateFabricRequest {
  name: string;
  imageBase64: string;
}
