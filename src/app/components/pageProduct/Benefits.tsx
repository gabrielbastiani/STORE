import { Truck, Shield, RotateCcw } from "lucide-react";

export default function Benefits() {
  return (
    <div className="bg-gray-50 p-4 rounded-lg space-y-3 text-gray-600">
      <div className="flex items-center gap-3 text-sm">
        <div className="bg-green-100 p-2 rounded-full">
          <Truck className="w-5 h-5 text-green-600" />
        </div>
        <div>
          <p className="font-medium text-gray-800">Frete Grátis</p>
          <p>Para compras acima de R$ 299</p>
        </div>
      </div>
      
      <div className="flex items-center gap-3 text-sm">
        <div className="bg-blue-100 p-2 rounded-full">
          <Shield className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <p className="font-medium text-gray-800">Garantia</p>
          <p>1 ano do fabricante</p>
        </div>
      </div>
      
      <div className="flex items-center gap-3 text-sm">
        <div className="bg-orange-100 p-2 rounded-full">
          <RotateCcw className="w-5 h-5 text-orange-600" />
        </div>
        <div>
          <p className="font-medium text-gray-800">Trocas Fáceis</p>
          <p>7 dias para trocar ou devolver</p>
        </div>
      </div>
    </div>
  );
}