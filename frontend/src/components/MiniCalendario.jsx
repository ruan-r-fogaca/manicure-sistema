import { useState } from 'react';

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];
const DIAS_SEMANA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

function paraISO(ano, mes, dia) {
  const mm = String(mes + 1).padStart(2, '0');
  const dd = String(dia).padStart(2, '0');
  return `${ano}-${mm}-${dd}`;
}

// Calendário pequeno: abre em popover, navega mês a mês (passado e futuro,
// sem limite), e ao clicar num dia chama onSelecionarData(dataISO).
export default function MiniCalendario({ dataSelecionada, onSelecionarData }) {
  const [aberto, setAberto] = useState(false);
  const base = dataSelecionada ? new Date(dataSelecionada + 'T12:00:00') : new Date();
  const [mesVisivel, setMesVisivel] = useState(base.getMonth());
  const [anoVisivel, setAnoVisivel] = useState(base.getFullYear());

  const primeiroDiaSemana = new Date(anoVisivel, mesVisivel, 1).getDay();
  const totalDias = new Date(anoVisivel, mesVisivel + 1, 0).getDate();
  const celulas = [...Array(primeiroDiaSemana).fill(null), ...Array(totalDias).keys()].map((d) =>
    d === null ? null : d + 1
  );

  function mudarMes(delta) {
    let novoMes = mesVisivel + delta;
    let novoAno = anoVisivel;
    if (novoMes < 0) {
      novoMes = 11;
      novoAno -= 1;
    } else if (novoMes > 11) {
      novoMes = 0;
      novoAno += 1;
    }
    setMesVisivel(novoMes);
    setAnoVisivel(novoAno);
  }

  function selecionar(dia) {
    onSelecionarData(paraISO(anoVisivel, mesVisivel, dia));
    setAberto(false);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        className="w-9 h-9 flex items-center justify-center rounded-full border border-base-200 bg-white text-plum-600"
        aria-label="Abrir calendário"
        title="Ver qualquer dia do ano"
      >
        📅
      </button>

      {aberto && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setAberto(false)} />
          <div className="absolute right-0 mt-2 z-50 bg-white border border-base-200 rounded-xl2 shadow-lg p-3 w-64">
            <div className="flex items-center justify-between mb-2">
              <button type="button" onClick={() => mudarMes(-1)} className="px-2 py-1 text-ink/50">
                ‹
              </button>
              <p className="text-sm font-medium">
                {MESES[mesVisivel]} {anoVisivel}
              </p>
              <button type="button" onClick={() => mudarMes(1)} className="px-2 py-1 text-ink/50">
                ›
              </button>
            </div>
            <div className="grid grid-cols-7 gap-1 mb-1">
              {DIAS_SEMANA.map((d, i) => (
                <span key={i} className="text-[10px] text-center text-ink/40 font-medium">
                  {d}
                </span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {celulas.map((dia, i) => {
                if (dia === null) return <span key={i} />;
                const iso = paraISO(anoVisivel, mesVisivel, dia);
                const selecionado = iso === dataSelecionada;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => selecionar(dia)}
                    className={`text-xs rounded-full w-7 h-7 flex items-center justify-center ${
                      selecionado ? 'bg-plum-600 text-white font-medium' : 'text-ink/70 hover:bg-base-100'
                    }`}
                  >
                    {dia}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}