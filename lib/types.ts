export type Nominee = {
  keyNominee: number;
  keyBrand: number;
  etc: string | null;
  subject: string;
  percent: number;
  count: number;
  rank: number;
  file?: { data?: string; w?: number; h?: number; saveFileExt?: string };
  otherFile?: { data?: string; w?: number; h?: number; saveFileExt?: string };
};

export type FancaResponse = {
  status: { code: number; message: string };
  nominee: Nominee[];
};
