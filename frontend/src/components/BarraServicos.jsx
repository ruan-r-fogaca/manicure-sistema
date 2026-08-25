// Barra lateral colorida do card de agendamento. Com 1 serviço é uma cor só
// (igual antes); com vários, divide a barra em partes iguais, uma cor por
// serviço, na mesma ordem em que aparecem no card.
export default function BarraServicos({ cores }) {
  if (!cores || cores.length === 0) return null;
  return (
    <div className="absolute left-0 top-0 bottom-0 w-1 flex flex-col">
      {cores.map((cor, i) => (
        <div key={i} className="flex-1" style={{ backgroundColor: cor }} />
      ))}
    </div>
  );
}
