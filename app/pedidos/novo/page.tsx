import NovoPedidoForm from './NovoPedidoForm'

export default function NovoPedidoPage() {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Novo Pedido</h1>
        <p className="text-gray-500 text-sm mt-1">Preencha os dados para cadastrar manualmente</p>
      </div>
      <NovoPedidoForm />
    </div>
  )
}