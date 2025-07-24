"use client";

import {
  useState,
  FormEvent,
  ChangeEvent,
  useContext,
  useEffect,
} from "react";
import { AuthContextStore } from "@/app/contexts/AuthContextStore";
import { api } from "@/services/apiClient";
import { toast } from "react-toastify";
import { FaRegTrashAlt } from "react-icons/fa";

type Sexo = "M" | "F" | "O";
type TypeUser = "FISICA" | "JURIDICA";

const API_URL = process.env.NEXT_PUBLIC_API_URL + "/files";

export const MeusDados: React.FC = () => {
  const { user, updateUser } = useContext(AuthContextStore);
  if (!user) return null;

  // ——— Máscaras CPF / CNPJ ———
  const maskCpf = (v: string) => {
    const d = v.replace(/\D/g, "").slice(0, 11);
    return d
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  };
  const maskCnpj = (v: string) => {
    const d = v.replace(/\D/g, "").slice(0, 14);
    return d
      .replace(/^(\d{2})(\d)/, "$1.$2")
      .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1/$2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  };

  // ——— Estado inicial ———
  const [typeUser, setTypeUser] = useState<TypeUser>(
    (user.type_user as TypeUser) || "FISICA"
  );
  const [email, setEmail] = useState(user.email);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [newsletter, setNewsletter] = useState(!!user.newsletter);

  // — Telefone —  
  const rawPhone = user.phone ?? "";
  const digits = rawPhone.replace(/\D/g, "");
  const initDdd = digits.slice(0, 2);
  const initPhone = digits.slice(2);
  const [ddd, setDdd] = useState(initDdd);
  const [phone, setPhone] = useState(initPhone);

  // — Pessoa Física —  
  const [cpf, setCpf] = useState(user.cpf ?? "");
  const [nameFisica, setNameFisica] = useState(user.name);
  const [dateOfBirth, setDateOfBirth] = useState(user.date_of_birth ?? "");
  const [sexo, setSexo] = useState<Sexo>((user.sexo as Sexo) ?? "O");

  // — Pessoa Jurídica —  
  const [cnpj, setCnpj] = useState(user.cnpj ?? "");
  const [razaoSocial, setRazaoSocial] = useState(user.name);
  const [stateRegistration, setStateRegistration] = useState(
    user.state_registration ?? ""
  );
  const [isentoIE, setIsentoIE] = useState(
    !user.state_registration || user.state_registration === ""
  );

  // — Preview da foto —  
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>(
    user.photo ? `${API_URL}/${user.photo}` : ""
  );
  const handlePhotoChange = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setPhotoFile(f);
    if (f) setPreview(URL.createObjectURL(f));
  };

  // — Reseta o form quando o contexto user muda —  
  useEffect(() => {
    setTypeUser((user.type_user as TypeUser) || "FISICA");
    setEmail(user.email);
    setNewsletter(!!user.newsletter);
    setDdd(initDdd);
    setPhone(initPhone);

    setCpf(user.cpf ?? "");
    setNameFisica(user.name);
    setDateOfBirth(user.date_of_birth ?? "");
    setSexo((user.sexo as Sexo) ?? "O");

    setCnpj(user.cnpj ?? "");
    setRazaoSocial(user.name);
    setStateRegistration(user.state_registration ?? "");
    setIsentoIE(!user.state_registration || user.state_registration === "");

    setPassword("");
    setConfirmPassword("");
    setPhotoFile(null);
    setPreview(user.photo ? `${API_URL}/${user.photo}` : "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // — Limpa só a UI quando marcar isento —  
  const toggleIsento = (checked: boolean) => {
    setIsentoIE(checked);
    if (checked) {
      setStateRegistration("");
    }
  };

  // — Envio do formulário —  
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (password && password !== confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }

    try {
      // Se marcou isento OU apagou tudo manualmente, considere limpar
      const shouldClearIE =
        isentoIE || (stateRegistration.trim() === "");

      const formData = new FormData();

      formData.append("customer_id", user.id);
      formData.append("email", email);
      if (password) formData.append("password", password);
      formData.append("newsletter", newsletter ? "true" : "false");
      formData.append("phone", `${ddd}${phone}`);
      formData.append("type_user", typeUser);

      if (typeUser === "FISICA") {
        formData.append("cpf", cpf.replace(/\D/g, ""));
        formData.append("name", nameFisica);
        formData.append("date_of_birth", dateOfBirth);
        formData.append("sexo", sexo);
      }

      if (typeUser === "JURIDICA") {
        formData.append("cnpj", cnpj.replace(/\D/g, ""));
        formData.append("name", razaoSocial);
        formData.append("state_registration", stateRegistration);
      }

      if (photoFile) formData.append("file", photoFile);

      const resp = await api.put(`/user/customer/update`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const updated = resp.data;
      // Garantir que o contexto receba o valor correto
      const finalStateRegistration = shouldClearIE ? "" : stateRegistration;

      updateUser({
        email: updated.email,
        name: updated.name,
        phone: updated.phone,
        type_user: updated.type_user,
        cpf: updated.cpf,
        cnpj: updated.cnpj,
        date_of_birth: updated.date_of_birth,
        sexo: updated.sexo,
        state_registration: finalStateRegistration,
        newsletter: updated.newsletter,
        photo: updated.photo,
      });

      toast.success("Dados atualizados com sucesso!");
    } catch (err) {
      console.error(err);
      toast.error("Falha ao atualizar seus dados.");
    }
  };

  async function deletePhotoCustomer() {
    try {
      await api.put(`/user/customer/delete_photo?customer_id=${user?.id}`)
      toast.success("Foto deletada com sucesso")
    } catch (error) {
      console.log(error)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 bg-white p-6 rounded shadow text-black"
    >
      {/* Foto + preview */}
      <div className="flex items-center space-x-4">
        {preview && (
          <img
            src={preview}
            alt="Preview"
            className="h-24 w-24 object-cover rounded-full border"
          />
        )}
        <div>
          <label className="block text-sm font-medium">Foto de Perfil</label>
          <input
            type="file"
            accept="image/*"
            onChange={handlePhotoChange}
            className="mt-1"
          />
          <FaRegTrashAlt
            size={20}
            color="red"
            className="mt-4 cursor-pointer"
            onClick={deletePhotoCustomer}
          />
        </div>
      </div>

      {/* E‑mail e CPF/CNPJ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium">E‑mail *</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="mt-1 block w-full border rounded p-2"
            placeholder="E‑mail"
          />
        </div>
        {typeUser === "FISICA" ? (
          <div>
            <label className="block text-sm font-medium">CPF *</label>
            <input
              type="text"
              value={cpf}
              onChange={(e) => setCpf(maskCpf(e.target.value))}
              required
              className="mt-1 block w-full border rounded p-2"
              placeholder="000.000.000-00"
            />
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium">CNPJ *</label>
            <input
              type="text"
              value={cnpj}
              onChange={(e) => setCnpj(maskCnpj(e.target.value))}
              required
              className="mt-1 block w-full border rounded p-2"
              placeholder="00.000.000/0000-00"
            />
          </div>
        )}
      </div>

      {/* Campos específicos */}
      {typeUser === "FISICA" ? (
        <>
          <div>
            <label className="block text-sm font-medium">Nome Completo *</label>
            <input
              type="text"
              value={nameFisica}
              onChange={(e) => setNameFisica(e.target.value)}
              required
              className="mt-1 block w-full border rounded p-2"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium">
                Data de Nascimento *
              </label>
              <input
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                required
                className="mt-1 block w-full border rounded p-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Gênero *</label>
              <select
                value={sexo}
                onChange={(e) => setSexo(e.target.value as Sexo)}
                required
                className="mt-1 block w-full border rounded p-2"
              >
                <option value="">Selecione…</option>
                <option value="M">Masculino</option>
                <option value="F">Feminino</option>
                <option value="O">Outro</option>
              </select>
            </div>
          </div>
        </>
      ) : (
        <>
          <div>
            <label className="block text-sm font-medium">Razão Social *</label>
            <input
              type="text"
              value={razaoSocial}
              onChange={(e) => setRazaoSocial(e.target.value)}
              required
              className="mt-1 block w-full border rounded p-2"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium">
                Inscrição Estadual *
              </label>
              <div className="mt-1 flex items-center space-x-2">
                <input
                  type="text"
                  value={stateRegistration}
                  onChange={(e) => setStateRegistration(e.target.value)}
                  disabled={isentoIE}
                  className="flex-1 border rounded p-2 disabled:bg-gray-100"
                />
                <label className="inline-flex items-center ml-2">
                  <input
                    type="checkbox"
                    checked={isentoIE}
                    onChange={(e) => toggleIsento(e.target.checked)}
                    className="form-checkbox"
                  />
                  <span className="ml-1 text-sm">I.E. Isento</span>
                </label>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Senhas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium">
            Informe a Senha {password === "" ? "(deixe em branco para manter)" : "*"}
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 block w-full border rounded p-2"
            placeholder="********"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Confirme a Senha</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="mt-1 block w-full border rounded p-2"
            placeholder="********"
          />
        </div>
      </div>

      {/* Telefone */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium">DDD *</label>
          <input
            type="text"
            value={ddd}
            onChange={(e) => setDdd(e.target.value)}
            required
            className="mt-1 block w-full border rounded p-2"
            placeholder="DDD"
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium">Telefone *</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            className="mt-1 block w-full border rounded p-2"
            placeholder="Telefone"
          />
        </div>
      </div>

      {/* Newsletter */}
      <div className="flex items-center">
        <input
          type="checkbox"
          checked={newsletter}
          onChange={(e) => setNewsletter(e.target.checked)}
          className="form-checkbox h-4 w-4"
        />
        <label className="ml-2 text-sm">Recebimento de Newsletter</label>
      </div>

      {/* Botão */}
      <div className="pt-4">
        <button
          type="submit"
          className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700"
        >
          Salvar Alterações
        </button>
      </div>
    </form>
  );
};