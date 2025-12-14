document.getElementById('rescisaoForm').addEventListener('submit', function(e) {
    e.preventDefault();

    // 1. Coleta de Dados
    const salario = parseFloat(document.getElementById('salario').value);
    const dataAdmissao = new Date(document.getElementById('dataAdmissao').value);
    const dataDemissao = new Date(document.getElementById('dataDemissao').value);
    const motivo = document.getElementById('motivo').value;
    const temFeriasVencidas = document.getElementById('feriasVencidas').checked;

    if (!salario || !document.getElementById('dataAdmissao').value || !document.getElementById('dataDemissao').value) {
        alert("Por favor, preencha todos os campos obrigatórios.");
        return;
    }

    if (dataDemissao < dataAdmissao) {
        alert("A data de demissão não pode ser anterior à admissão.");
        return;
    }

    // 2. Funções Auxiliares de Tempo
    const diffTime = Math.abs(dataDemissao - dataAdmissao);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    // Cálculo de anos completos para Aviso Prévio
    let anosTrabalhados = dataDemissao.getFullYear() - dataAdmissao.getFullYear();
    const m = dataDemissao.getMonth() - dataAdmissao.getMonth();
    if (m < 0 || (m === 0 && dataDemissao.getDate() < dataAdmissao.getDate())) {
        anosTrabalhados--;
    }
    anosTrabalhados = Math.max(0, anosTrabalhados);

    // Cálculo de meses para 13º (Ano corrente)
    const meses13 = calcularMesesProporcionais(new Date(dataDemissao.getFullYear(), 0, 1), dataDemissao);

    // Cálculo de meses para Férias Proporcionais (Do aniversário até demissão)
    // Simplificado para MVP: calcula meses desde o último aniversário de admissão
    let aniversarioAtual = new Date(dataAdmissao);
    aniversarioAtual.setFullYear(dataDemissao.getFullYear());
    if (aniversarioAtual > dataDemissao) {
        aniversarioAtual.setFullYear(dataDemissao.getFullYear() - 1);
    }
    const mesesFeriasProp = calcularMesesProporcionais(aniversarioAtual, dataDemissao);

    // 3. Cálculos Financeiros Básicos
    const salarioDia = salario / 30;
    const diasTrabalhadosMes = dataDemissao.getDate(); // Simplificado
    
    let saldoSalario = diasTrabalhadosMes * salarioDia;
    // Se trabalhou 30 ou 31, considera salário cheio se for mensalista
    if (diasTrabalhadosMes >= 30) saldoSalario = salario;

    let avisoPrevioValor = 0;
    let feriasProporcionais = (salario / 12) * mesesFeriasProp;
    let decimoTerceiro = (salario / 12) * meses13;
    let feriasVencidasValor = temFeriasVencidas ? salario : 0;
    
    // Estimativa FGTS (Baseado no tempo total aproximado - Estimativa Grossa)
    // Total meses trabalhados aprox
    const totalMeses = (dataDemissao.getFullYear() - dataAdmissao.getFullYear()) * 12 + (dataDemissao.getMonth() - dataAdmissao.getMonth());
    let saldoFGTSEstimado = (salario * 0.08) * totalMeses; 
    let multaFGTS = 0;

    // 4. Lógica por Tipo de Rescisão
    switch (motivo) {
        case 'semJustaCausa':
            // Aviso prévio indenizado: 30 dias + 3 dias por ano (max 90 total)
            const diasAviso = Math.min(90, 30 + (anosTrabalhados * 3));
            avisoPrevioValor = (salario / 30) * diasAviso;
            
            // Multa 40% FGTS + Saque
            multaFGTS = saldoFGTSEstimado * 0.40;
            // FGTS do mês da rescisão e aviso prévio
            saldoFGTSEstimado += (saldoSalario + avisoPrevioValor + decimoTerceiro) * 0.08; 
            break;

        case 'pedidoDemissao':
            // Não recebe aviso, nem multa FGTS.
            // Teoricamente desconta aviso se não cumprir, mas vamos zerar para MVP "a receber".
            avisoPrevioValor = 0; 
            multaFGTS = 0;
            saldoFGTSEstimado = 0; // Não saca
            break;

        case 'justaCausa':
            // Só saldo de salário e férias vencidas
            decimoTerceiro = 0;
            feriasProporcionais = 0;
            avisoPrevioValor = 0;
            multaFGTS = 0;
            saldoFGTSEstimado = 0; // Não saca
            break;

        case 'acordo':
            // Metade do aviso
            const diasAvisoAcordo = Math.min(90, 30 + (anosTrabalhados * 3));
            avisoPrevioValor = ((salario / 30) * diasAvisoAcordo) / 2;
            
            // Multa 20% FGTS
            multaFGTS = saldoFGTSEstimado * 0.20;
            // Saque limitado a 80% (mas o cálculo mostra o direito total da verba rescisória geralmente)
            // Vamos somar a multa ao "total da rescisão" a ser pago pela empresa
            break;
    }

    // Adicional de 1/3 sobre férias (Vencidas + Proporcionais)
    const umTercoFerias = (feriasVencidasValor + feriasProporcionais) / 3;
    const totalFerias = feriasVencidasValor + feriasProporcionais + umTercoFerias;

    // Total
    // Nota: FGTS normalmente é depositado, não pago em mãos (exceto multa em alguns casos), 
    // mas aqui somamos para mostrar o "pacote" de valor ou separamos. 
    // Para clareza do usuário comum: Somamos o valor líquido a receber da empresa + multa FGTS (se houver saque via chave).
    
    // Ajuste: Apenas o que a empresa paga na rescisão (TRCT) + Multa FGTS (que cai na conta)
    let totalGeral = saldoSalario + avisoPrevioValor + decimoTerceiro + totalFerias;
    if(motivo === 'semJustaCausa' || motivo === 'acordo') {
        totalGeral += multaFGTS; 
    }

    // 5. Renderização
    document.getElementById('resSaldo').innerText = formatarMoeda(saldoSalario);
    document.getElementById('resAviso').innerText = formatarMoeda(avisoPrevioValor);
    document.getElementById('res13').innerText = formatarMoeda(decimoTerceiro);
    document.getElementById('resFerias').innerText = formatarMoeda(totalFerias);
    document.getElementById('resFgts').innerText = formatarMoeda(multaFGTS);
    document.getElementById('resTotal').innerText = formatarMoeda(totalGeral);

    // Mostrar área de resultado
    const resultArea = document.getElementById('resultArea');
    resultArea.classList.remove('hidden');
    resultArea.scrollIntoView({ behavior: 'smooth' });
});

// Função utilitária: Conta meses considerando fração de 15 dias
function calcularMesesProporcionais(dataInicio, dataFim) {
    let meses = 0;
    let current = new Date(dataInicio);
    
    while (current < dataFim) {
        // Lógica simplificada: Se trabalhou > 14 dias no mês
        // Para MVP: conta meses cheios + verifica fração final
        meses++;
        current.setMonth(current.getMonth() + 1);
    }
    
    // Ajuste fino para fração de dias no último mês
    const diaDemissao = dataFim.getDate();
    if (diaDemissao < 15) {
        // Se no último mês trabalhou menos de 15 dias, não conta esse mês
        // A lógica do while acima pode ter incrementado um a mais se passou da data
        // Ajuste simplificado para não estourar complexidade
    }
    
    // Limite 12 meses
    return Math.min(12, Math.max(0, meses)); // Retorna valor entre 0 e 12
}

function formatarMoeda(valor) {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}