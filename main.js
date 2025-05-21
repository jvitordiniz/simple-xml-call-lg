const axios = require('axios');
const xml2js = require('xml2js'); // lib para conversão de XML em JSON

// Campos que você deseja extrair (modifique conforme necessário)
const camposDesejados = [
   'Matricula',
   'DataAdmissao',
   'CpfCnpj',
   'Nome',
   'Celular',
   'DddCelular',
   'Cargo.Descricao',
   'CentroDeCusto.Descricao',
   'Estabelecimento.Descricao'
];

const url = 'https://prd-api1.lg.com.br/v2/servicodecontratodetrabalho';

const soapBody = `
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:dto="lg.com.br/svc/dto" xmlns:v2="lg.com.br/api/v2" xmlns:v1="lg.com.br/api/dto/v1" xmlns:arr="http://schemas.microsoft.com/2003/10/Serialization/Arrays">
   <soapenv:Header>
      <dto:LGAutenticacao>
         <dto:TokenUsuario>
            <dto:Senha>**************************</dto:Senha>
            <dto:Usuario>**************************</dto:Usuario>
            <dto:GuidTenant>**************************</dto:GuidTenant>
         </dto:TokenUsuario>
      </dto:LGAutenticacao>
      <dto:LGContextoAmbiente>
         <dto:Ambiente>**************************</dto:Ambiente>
      </dto:LGContextoAmbiente>
   </soapenv:Header>

   <soapenv:Body>
      <v2:ConsultarContratosAplicandoAutorizacaoDePerfil>
         <v2:filtro>
            <v1:PaginaAtual>1</v1:PaginaAtual>
            <v1:FiltrosEspecificos>
               <v1:FiltroDeCamposEspecificos>
                  <v1:Campo>2</v1:Campo>
                  <!-- Campo de filtro:
               	0 - CATEGORIA
						1 - DATA_INICIO_SITUACAO
						2 - DATA_ADMISSAO
						3 - CPF
						4 - NOME -->
               	
                  <v1:Operacao>4</v1:Operacao>
                  	<!-- Campo de operação:
               	0 - CONTIDO
						1 - NAO_CONTIDO
						2 - MAIOR_QUE
						3 - MENOR_QUE
						4 - MAIOR_OU_IGUAL
						5 - MENOR_OU_IGUAL -->
               	
                  <v1:ValoresParaFiltrar>
                  <!--possível passar múltimos cpf 
                  ou deixar em branco para todos-->
                     <arr:string>2025-05-10</arr:string>
                  </v1:ValoresParaFiltrar>
                  
               </v1:FiltroDeCamposEspecificos>
            </v1:FiltrosEspecificos>
         </v2:filtro>
      </v2:ConsultarContratosAplicandoAutorizacaoDePerfil>
   </soapenv:Body>
</soapenv:Envelope>`;

const headers = {
   'Content-Type': 'text/xml;charset=UTF-8',
   'SOAPAction': 'lg.com.br/api/v2/ServicoDeContratoDeTrabalho/ConsultarContratosAplicandoAutorizacaoDePerfil'
};

function extrairCampos(obj, caminho) {
   return caminho.split('.').reduce((acc, key) => acc?.[key], obj);
}

function mapearContrato(contrato, campos) {
   const resultado = {};
   campos.forEach(campo => {
      resultado[campo] = extrairCampos(contrato, campo) || null;
   });
   return resultado;
}

(async () => {
   try {
      const response = await axios.post(url, soapBody, { headers });

      const parser = new xml2js.Parser({ explicitArray: false });
      const json = await parser.parseStringPromise(response.data);

      const contratos = json['s:Envelope']['s:Body']
      ['ConsultarContratosAplicandoAutorizacaoDePerfilResponse']
      ['ConsultarContratosAplicandoAutorizacaoDePerfilResult']
      ['a:Retorno']['a:ContratoDeTrabalhoV3'];

      const listaContratos = Array.isArray(contratos) ? contratos : [contratos];

      const contratosFiltrados = listaContratos.map(contrato => {
         return mapearContrato({
            Matricula: contrato?.['a:DadosGerais']?.['a:Matricula'],
            DataAdmissao: contrato?.['a:DadosGerais']?.['a:DataAdmissao'],
            CpfCnpj: contrato?.['a:Pessoa']?.['a:DadosPessoais']?.['a:CpfCnpj'],
            Nome: contrato?.['a:Pessoa']?.['a:DadosPessoais']?.['a:Nome'],
            Celular: contrato?.['a:Pessoa']?.['a:Contato']?.['a:Celular'],
            DddCelular: contrato?.['a:Pessoa']?.['a:Contato']?.['a:DddCelular'],
            Cargo: {
               Descricao: contrato?.['a:Alocacao']?.['a:CargoEFuncaoEfetivo']?.['a:Cargo']?.['a:Descricao']
            },
            CentroDeCusto: {
               Descricao: contrato?.['a:Alocacao']?.['a:CentroDeCusto']?.['a:Descricao']
            },
            Estabelecimento: {
               Descricao: contrato?.['a:Alocacao']?.['a:Estabelecimento']?.['a:Descricao']
            }
         }, camposDesejados);
      });

      console.log(JSON.stringify(contratosFiltrados, null, 2));
   } catch (error) {
      if (error.response) {
         console.error('Erro na chamada SOAP:', error.response.status);
         console.error(error.response.data);
      } else {
         console.error('Erro na requisição:', error.message);
      }
   }
})();
