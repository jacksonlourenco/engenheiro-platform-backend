import https from "https";
import { Request, Response } from "express";

const cepRegex = /^\d{8}$/;

function fetchJson(url: string, timeoutMs = 6000): Promise<any> {
  return new Promise((resolve, reject) => {
    const req = https.get(url, (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += String(chunk);
      });
      res.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed);
        } catch (err) {
          reject(err);
        }
      });
    });

    req.on("error", reject);
    req.setTimeout(timeoutMs, () => {
      req.destroy(new Error("CEP lookup timed out."));
    });
  });
}

export async function lookupCep(req: Request, res: Response): Promise<Response> {
  const cep = String(req.params.cep || "").trim();

  if (!cepRegex.test(cep)) {
    return res.status(400).json({ message: "Invalid CEP. Use 8 digits only." });
  }

  try {
    const data = await fetchJson(`https://viacep.com.br/ws/${cep}/json/`);
    if (data?.erro) {
      return res.status(404).json({ message: "CEP not found." });
    }

    return res.status(200).json({
      cep: data.cep || cep,
      logradouro: data.logradouro || "",
      complemento: data.complemento || "",
      bairro: data.bairro || "",
      localidade: data.localidade || "",
      uf: data.uf || "",
      ibge: data.ibge || "",
    });
  } catch (err) {
    return res.status(502).json({ message: "Failed to lookup CEP." });
  }
}

