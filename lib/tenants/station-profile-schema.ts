import { z } from "zod";

export const stationProfileSchema = z.object({
  name: z.string().min(2, "Station name is required."),
  addressLine1: z.string().min(2, "Address is required."),
  addressLine2: z.string().optional(),
  city: z.string().min(1, "City is required."),
  state: z.string().min(1, "State is required."),
  pincode: z.string().min(4, "Pincode is required."),
  phone: z.string().optional(),
});
