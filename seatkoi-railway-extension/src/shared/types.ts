export type RailwayCredentials = {
  token: string;
  deviceId: string;
  deviceKey: string;
};

// Requests
export type RailwayReadRequest = {
  type: "RAILWAY_READ_CREDENTIALS";
};

export type SeatKoiSaveRequest = {
  type: "SEATKOI_SAVE_CREDENTIALS";
  credentials: RailwayCredentials;
};

// Responses
export type RailwayReadResponse =
  | { success: true; credentials: RailwayCredentials }
  | { success: false; message: string };

export type SeatKoiTransferResponse =
  | { success: true }
  | { success: false; message: string };