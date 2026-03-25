import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// ─── Tabela NCM curada para artesanato brasileiro ─────────────────────────────
const NCM_ARTESANATO = [

  // ── PAPELARIA / IMPRESSOS ─────────────────────────────────────────────────
  { id: '4901', nome: 'Livros, revistas e publicações impressas', icmsInterno: 0.00, ipi: 0.00, tags: ['livro','agenda','caderno publicado'], nota: 'Imunes de ICMS e IPI por força constitucional.' },
  { id: '4902', nome: 'Jornais e periódicos', icmsInterno: 0.00, ipi: 0.00, tags: ['jornal','periódico','boletim'], nota: 'Imunes de ICMS e IPI.' },
  { id: '4909', nome: 'Cartões postais, cartões de felicitações e convites impressos', icmsInterno: 0.18, ipi: 0.00, tags: ['convite','cartão','postal','felicitação','aniversário','casamento','chá','save the date'], nota: 'ICMS 18% SP. IPI 0% para impressos gráficos.' },
  { id: '4910', nome: 'Calendários impressos (personalizados)', icmsInterno: 0.18, ipi: 0.00, tags: ['calendário','planner','organizador impresso'], nota: 'ICMS 18% SP. IPI isento.' },
  { id: '4911', nome: 'Tags, adesivos, etiquetas e outros impressos', icmsInterno: 0.18, ipi: 0.00, tags: ['tag','adesivo','etiqueta','rótulo','sticker','logo impresso','papelaria personalizada','chancela'], nota: 'ICMS 18% SP. IPI isento para impressos gráficos.' },
  { id: '4819', nome: 'Caixas, caixinhas e embalagens de papel/papelão', icmsInterno: 0.18, ipi: 0.10, tags: ['caixa','caixinha','embalagem','cofrinho papel','packaging','caixa presente','cx papelão'], nota: 'ICMS 18% SP. IPI 10%.' },
  { id: '4820', nome: 'Cadernos, agendas, blocos e álbuns artesanais', icmsInterno: 0.18, ipi: 0.00, tags: ['caderno','agenda','bloco','álbum','diário','scrapbook','encadernação'], nota: 'ICMS 18% SP. IPI 0%.' },
  { id: '4821', nome: 'Etiquetas de papel ou cartão (todas espécies)', icmsInterno: 0.18, ipi: 0.00, tags: ['etiqueta papel','label','tag papel','identificação'], nota: 'ICMS 18% SP. IPI isento.' },
  { id: '4823', nome: 'Papel recortado, papel cartão e cartolina artesanal', icmsInterno: 0.18, ipi: 0.00, tags: ['papel recortado','cartolina','papel cartão','scrap','eva','papel craft'], nota: 'ICMS 18% SP.' },

  // ── ARTIGOS DE FESTA / DECORAÇÃO ──────────────────────────────────────────
  { id: '9505', nome: 'Artigos de festa, carnaval e entretenimento (toppers, enfeites, balões decorativos)', icmsInterno: 0.18, ipi: 0.15, tags: ['topper','enfeite mesa','artigo festa','carnaval','halloween','natalino','decoração festa','painel','balão','bexiga','kit festa'], nota: 'ICMS 18% SP. IPI 15% (RC SEFAZ-SP 5171/2015).' },
  { id: '9504', nome: 'Jogos, brinquedos artesanais e quebra-cabeças personalizados', icmsInterno: 0.18, ipi: 0.10, tags: ['jogo','brinquedo','quebra-cabeça','puzzle','jogo madeira','memória'], nota: 'ICMS 18% SP. IPI 10%.' },

  // ── EMBALAGENS E UTILIDADES ───────────────────────────────────────────────
  { id: '3923', nome: 'Embalagens plásticas, saquinhos e potes decorativos', icmsInterno: 0.18, ipi: 0.00, tags: ['saquinho','embalagem plástica','pote plástico','sacola','zip','celofane'], nota: 'ICMS 18% SP. IPI 0%.' },
  { id: '6305', nome: 'Sacos e sacolas de tecido (algodão cru, linho, juta)', icmsInterno: 0.12, ipi: 0.00, tags: ['sacola tecido','saco algodão','sacola juta','sacola linho','bag personalizada','ecobag'], nota: 'ICMS 12% SP (têxtil). IPI 0%.' },
  { id: '6307', nome: 'Enxoval, porta-objetos, necessaires e bolsas artesanais de tecido', icmsInterno: 0.12, ipi: 0.00, tags: ['necessaire','porta objetos','organizador tecido','bolsa tecido','porta lápis','estojo','frasqueira'], nota: 'ICMS 12% SP. IPI 0%.' },

  // ── TÊXTEIS / COSTURA CRIATIVA ────────────────────────────────────────────
  { id: '5007', nome: 'Tecidos de seda e fibras nobres (para costura)', icmsInterno: 0.12, ipi: 0.00, tags: ['tecido seda','cetim','chiffon','organza','voal','viscose'], nota: 'ICMS 12% SP. IPI 0%.' },
  { id: '5208', nome: 'Tecidos de algodão (percal, tricoline, oxford, linho)', icmsInterno: 0.12, ipi: 0.00, tags: ['tecido algodão','percal','tricoline','oxford','linho','chitão','estampado','atoalhado'], nota: 'ICMS 12% SP. IPI 0%.' },
  { id: '5407', nome: 'Tecidos sintéticos (nylon, poliéster, helanca)', icmsInterno: 0.12, ipi: 0.00, tags: ['nylon','poliéster','helanca','lycra','tule','malha sintética'], nota: 'ICMS 12% SP. IPI 0%.' },
  { id: '5601', nome: 'Mantas de enchimento, manta acrílica, fibra siliconada', icmsInterno: 0.12, ipi: 0.00, tags: ['manta','enchimento','fibra siliconada','pluma','wadding','batting','manta acrílica'], nota: 'ICMS 12% SP. IPI 0%.' },
  { id: '5806', nome: 'Fitas, vieses, passamanaria e bordados por metro', icmsInterno: 0.12, ipi: 0.00, tags: ['fita','viés','passamanaria','galão','entremeio','bordado','richelieu','renda','franja'], nota: 'ICMS 12% SP. IPI 0%.' },
  { id: '5807', nome: 'Etiquetas e distintivos de tecido (bordados, woven)', icmsInterno: 0.12, ipi: 0.00, tags: ['etiqueta tecido','patch','aplique','woven label','bordado nome','termocolante'], nota: 'ICMS 12% SP. IPI 0%.' },
  { id: '5810', nome: 'Bordados em peça, em tiras ou em motivos', icmsInterno: 0.12, ipi: 0.00, tags: ['bordado','aplicação bordada','motivo bordado','brasão','emblema bordado'], nota: 'ICMS 12% SP. IPI 0%.' },
  { id: '5811', nome: 'Tecidos matelassados, capitonê e acolchoados', icmsInterno: 0.12, ipi: 0.00, tags: ['matelassê','capitonê','acolchoado','quilting','patchwork acolchoado'], nota: 'ICMS 12% SP. IPI 0%.' },
  { id: '6001', nome: 'Pelúcias, tecidos de pelo e plush', icmsInterno: 0.12, ipi: 0.00, tags: ['pelúcia','plush','pelo','fleece','soft'], nota: 'ICMS 12% SP. IPI 0%.' },
  { id: '6214', nome: 'Xales, lenços, echarpes e artigos de pescoço em tecido', icmsInterno: 0.12, ipi: 0.00, tags: ['xale','lenço','echarpe','bandana','scrunchie','turbante'], nota: 'ICMS 12% SP. IPI 0%.' },
  { id: '6217', nome: 'Laços, acessórios e artigos de vestuário em tecido', icmsInterno: 0.12, ipi: 0.00, tags: ['laço','laço cabelo','laço presente','gravata','borboleta','faixa','tiara','headband','laço cetim','laço gorgurão','laço bebê','acessório cabelo'], nota: 'ICMS 12% SP. IPI 0%.' },
  { id: '6301', nome: 'Cobertores, mantas e throws artesanais', icmsInterno: 0.12, ipi: 0.00, tags: ['cobertor','manta decorativa','throw','manta crochê','manta bebê'], nota: 'ICMS 12% SP. IPI 0%.' },
  { id: '6302', nome: 'Enxoval de cama, mesa e banho bordado/personalizado', icmsInterno: 0.12, ipi: 0.00, tags: ['jogo cama','toalha bordada','guardanapo','enxoval','lençol personalizado','pano copa'], nota: 'ICMS 12% SP. IPI 0%.' },
  { id: '6304', nome: 'Almofadas, capas de almofada e artigos decorativos de tecido', icmsInterno: 0.12, ipi: 0.00, tags: ['almofada','capa almofada','futon','cojín','travesseiro decorativo','almofada bordada'], nota: 'ICMS 12% SP. IPI 0%.' },
  { id: '6308', nome: 'Kit costura, kits de patchwork e croché para artesanato', icmsInterno: 0.12, ipi: 0.00, tags: ['kit costura','kit patchwork','kit crochê','kit bordado','kit amigurumi','kit artesanato'], nota: 'ICMS 12% SP. IPI 0%.' },

  // ── FIOS, LINHAS E AVIAMENTOS ─────────────────────────────────────────────
  { id: '5204', nome: 'Linhas de costura de algodão', icmsInterno: 0.12, ipi: 0.00, tags: ['linha costura','linha algodão','linha bordado','linha ponto cruz'], nota: 'ICMS 12% SP. IPI 0%.' },
  { id: '5205', nome: 'Fios de algodão (crochê, tricô, macramê)', icmsInterno: 0.12, ipi: 0.00, tags: ['fio algodão','novelo','barbante','cordão algodão','macramê','crochê fio'], nota: 'ICMS 12% SP. IPI 0%.' },
  { id: '5508', nome: 'Linhas e fios sintéticos (poliéster, nylon)', icmsInterno: 0.12, ipi: 0.00, tags: ['fio poliéster','linha nylon','elástico','fio sintético','linha overlock'], nota: 'ICMS 12% SP. IPI 0%.' },
  { id: '5606', nome: 'Fios metalizados, lurex e chenille', icmsInterno: 0.12, ipi: 0.00, tags: ['lurex','metalizado','chenille','fio glitter','fio brilho'], nota: 'ICMS 12% SP. IPI 0%.' },
  { id: '5609', nome: 'Cordas, fitilhos, cordões e tramas diversas', icmsInterno: 0.12, ipi: 0.00, tags: ['corda','fitilho','cordão','trança','barbante colorido','sisal'], nota: 'ICMS 12% SP. IPI 0%.' },
  { id: '9612', nome: 'Fitas para máquina de bordar, impressão e rotulagem', icmsInterno: 0.18, ipi: 0.00, tags: ['fita impressora','fita bordadeira','cartucho bordado'], nota: 'ICMS 18% SP. IPI 0%.' },

  // ── AVIAMENTOS E ACESSÓRIOS DE COSTURA ────────────────────────────────────
  { id: '9606', nome: 'Botões, ilhós, colchetes e fechos de pressão', icmsInterno: 0.18, ipi: 0.10, tags: ['botão','ilhós','colchete','pressão','snap','fivela','gancho'], nota: 'ICMS 18% SP. IPI 10%.' },
  { id: '9607', nome: 'Zíperes e fechos eclair', icmsInterno: 0.18, ipi: 0.10, tags: ['zíper','zipper','fecho eclair','zíper emborrachado'], nota: 'ICMS 18% SP. IPI 10%.' },
  { id: '9608', nome: 'Agulhas, alfinetes e espetos para costura', icmsInterno: 0.18, ipi: 0.00, tags: ['agulha','alfinete','espeto','agulha bordado','agulha crochê'], nota: 'ICMS 18% SP. IPI 0%.' },
  { id: '5607', nome: 'Elásticos para costura e artesanato', icmsInterno: 0.12, ipi: 0.00, tags: ['elástico','elástico chato','elástico redondo','elástico cadarço'], nota: 'ICMS 12% SP. IPI 0%.' },

  // ── MADEIRA E DERIVADOS ───────────────────────────────────────────────────
  { id: '4414', nome: 'Molduras e caixilhos de madeira', icmsInterno: 0.18, ipi: 0.10, tags: ['moldura','caixilho','quadro madeira','porta-retrato madeira'], nota: 'ICMS 18% SP. IPI 10%.' },
  { id: '4415', nome: 'Caixotes e embalagens de madeira', icmsInterno: 0.18, ipi: 0.00, tags: ['caixote madeira','engradado madeira','baú madeira'], nota: 'ICMS 18% SP. IPI 0%.' },
  { id: '4420', nome: 'Objetos decorativos e utensílios de madeira torneada/entalhada', icmsInterno: 0.18, ipi: 0.10, tags: ['objeto madeira','enfeite madeira','escultura madeira','totem','porta vela madeira','bandeja madeira','bowl madeira','tábua personalizada'], nota: 'ICMS 18% SP. IPI 10%.' },
  { id: '4421', nome: 'Outros artefatos de madeira (MDF, pallet, faqueado)', icmsInterno: 0.18, ipi: 0.00, tags: ['mdf','compensado','placa madeira','fundo mdf','peça mdf','corte laser madeira'], nota: 'ICMS 18% SP. IPI 0%.' },
  { id: '4602', nome: 'Cestaria, trançados e artigos de vime/bambu/palha', icmsInterno: 0.18, ipi: 0.00, tags: ['cesto','cestaria','vime','bambu','palha','trança palha','rattan'], nota: 'ICMS 18% SP. IPI 0%.' },

  // ── CERÂMICA E ARGILA ─────────────────────────────────────────────────────
  { id: '6911', nome: 'Louças e artigos de cerâmica para mesa e decoração', icmsInterno: 0.18, ipi: 0.10, tags: ['cerâmica','porcelana','louça','caneca cerâmica','prato decorativo','travessa'], nota: 'ICMS 18% SP. IPI 10%.' },
  { id: '6912', nome: 'Artigos de cerâmica e biscuit (não porcelana)', icmsInterno: 0.18, ipi: 0.00, tags: ['biscuit','cerâmica fria','argila','porcelana fria','pasta americana','gesso'], nota: 'ICMS 18% SP. IPI 0%.' },
  { id: '6913', nome: 'Estatuetas e objetos de ornamentação de cerâmica', icmsInterno: 0.18, ipi: 0.00, tags: ['estatueta','figura cerâmica','boneco biscuit','enfeite cerâmica','miniatura'], nota: 'ICMS 18% SP. IPI 0%.' },

  // ── VIDRO E RESINA ────────────────────────────────────────────────────────
  { id: '7013', nome: 'Objetos de vidro para uso doméstico e decorativo', icmsInterno: 0.18, ipi: 0.15, tags: ['vidro','copos vidro','vasos vidro','garrafas decorativas','terrário','vitral'], nota: 'ICMS 18% SP. IPI 15%.' },
  { id: '3926', nome: 'Artigos de resina epóxi, acrílico e plástico artesanal', icmsInterno: 0.18, ipi: 0.00, tags: ['resina','epóxi','resina epóxi','acrílico','plástico artesanal','glitter resina','bandeja resina','chaveiro resina'], nota: 'ICMS 18% SP. IPI 0%.' },

  // ── METAL / BIJUTERIA ─────────────────────────────────────────────────────
  { id: '7117', nome: 'Bijuterias (colares, pulseiras, brincos, anéis não preciosos)', icmsInterno: 0.18, ipi: 0.10, tags: ['bijuteria','colar','pulseira','brinco','anel','bracelete','pingente','argola'], nota: 'ICMS 18% SP. IPI 10%.' },
  { id: '7116', nome: 'Artigos de pérolas, pedras preciosas e semipreciosas', icmsInterno: 0.18, ipi: 0.00, tags: ['pérola','pedra natural','semipreciosa','cristal','ágata','quartzo','howlita'], nota: 'ICMS 18% SP. IPI 0%.' },
  { id: '8308', nome: 'Fechos metálicos, ilhós, ganchos e argolas para artesanato', icmsInterno: 0.18, ipi: 0.05, tags: ['fecho metal','ilhós metal','gancho metal','argola metal','mosquetão','pino','base broche'], nota: 'ICMS 18% SP. IPI 5%.' },
  { id: '8310', nome: 'Placas, letreiros e letras de metal decorativos', icmsInterno: 0.18, ipi: 0.10, tags: ['placa metal','letras metal','letreiro','número metal','tag metal','inicial metal'], nota: 'ICMS 18% SP. IPI 10%.' },

  // ── COURO E COURO SINTÉTICO ───────────────────────────────────────────────
  { id: '4205', nome: 'Artefatos de couro e artigos artesanais em couro legítimo', icmsInterno: 0.18, ipi: 0.00, tags: ['couro','artesanato couro','cinto couro','bolsa couro','porta-chave couro','carteira couro'], nota: 'ICMS 18% SP. IPI 0%.' },
  { id: '3926', nome: 'Artigos de couro sintético (courino, corino, PU)', icmsInterno: 0.18, ipi: 0.00, tags: ['courino','corino','couro sintético','couro PU','couro ecológico','laço couro'], nota: 'ICMS 18% SP. IPI 0%.' },

  // ── VELAS E AROMATERAPIA ──────────────────────────────────────────────────
  { id: '3406', nome: 'Velas decorativas, aromáticas e artesanais', icmsInterno: 0.18, ipi: 0.00, tags: ['vela','vela aromática','vela decorativa','vela soja','vela parafina','vela gel','vela personalizada'], nota: 'ICMS 18% SP. IPI 0%.' },
  { id: '3307', nome: 'Sachês perfumados, difusores e aromatizadores artesanais', icmsInterno: 0.25, ipi: 0.10, tags: ['sachê','difusor','aromatizador','home spray','água perfumada','potpourri'], nota: 'ICMS 25% SP (perfumaria). IPI 10%.' },

  // ── SABONETES E COSMÉTICO ARTESANAL ──────────────────────────────────────
  { id: '3401', nome: 'Sabonetes artesanais, saboaria e produtos de limpeza', icmsInterno: 0.18, ipi: 0.00, tags: ['sabonete','sabonete artesanal','saboaria','cold process','sabão','glycerina'], nota: 'ICMS 18% SP. IPI 0%.' },
  { id: '3305', nome: 'Produtos para cabelo artesanais (leave-in, finalizador)', icmsInterno: 0.25, ipi: 0.10, tags: ['leave-in','creme cabelo','finalizador','shampoo artesanal','máscara cabelo'], nota: 'ICMS 25% SP. IPI 10%.' },

  // ── TINTA E MATERIAIS DE PINTURA ──────────────────────────────────────────
  { id: '3208', nome: 'Tintas acrílicas e vernizes para artesanato', icmsInterno: 0.18, ipi: 0.08, tags: ['tinta acrílica','tinta pva','verniz','esmalte','tinta tecido','tinta vitral'], nota: 'ICMS 18% SP. IPI 8%.' },
  { id: '3212', nome: 'Glitter, purpurina, pigmentos e corantes para artesanato', icmsInterno: 0.18, ipi: 0.00, tags: ['glitter','purpurina','pigmento','corante','mica','pó metálico'], nota: 'ICMS 18% SP. IPI 0%.' },
  { id: '9609', nome: 'Lápis, canetinhas, marcadores e canetas artísticas', icmsInterno: 0.18, ipi: 0.05, tags: ['lápis','canetinha','marcador','caneta artística','giz','pastel','aquarela'], nota: 'ICMS 18% SP. IPI 5%.' },

  // ── CROCHÊ / TRICÔ / AMIGURUMI ────────────────────────────────────────────
  { id: '6111', nome: 'Vestuário infantil de malha (crochê/tricô bebê)', icmsInterno: 0.12, ipi: 0.00, tags: ['roupa bebê crochê','sapatinho crochê','touca crochê','conjunto bebê tricô'], nota: 'ICMS 12% SP. IPI 0%.' },
  { id: '6116', nome: 'Luvas, mitenes e artigos de mão de malha', icmsInterno: 0.12, ipi: 0.00, tags: ['luva crochê','mitene','polegar crochê','luva tricô'], nota: 'ICMS 12% SP. IPI 0%.' },
  { id: '9503', nome: 'Bonecos de crochê, amigurumis e pelúcias artesanais', icmsInterno: 0.18, ipi: 0.10, tags: ['amigurumi','boneco crochê','pelúcia artesanal','boneco pano','boneca pano','bicho crochê'], nota: 'ICMS 18% SP. IPI 10%.' },

  // ── MACRAMÊ E DECORAÇÃO ───────────────────────────────────────────────────
  { id: '5609', nome: 'Macramê, wall art e artigos de corda decorativos', icmsInterno: 0.12, ipi: 0.00, tags: ['macramê','wall art','tapeçaria','painel corda','dreamcatcher','filtro dos sonhos','porta vaso macramê'], nota: 'ICMS 12% SP. IPI 0%.' },
  { id: '6303', nome: 'Cortinas, painéis e artigos de decoração têxtil para janelas', icmsInterno: 0.12, ipi: 0.00, tags: ['cortina','painel','persiana tecido','bandô','valance'], nota: 'ICMS 12% SP. IPI 0%.' },

  // ── PATCHWORK E QUILTING ──────────────────────────────────────────────────
  { id: '5811', nome: 'Colchas, quilts e patchwork', icmsInterno: 0.12, ipi: 0.00, tags: ['patchwork','quilt','colcha patchwork','manta patchwork','apliquê patchwork'], nota: 'ICMS 12% SP. IPI 0%.' },

  // ── KITS E CONJUNTOS ─────────────────────────────────────────────────────
  { id: '9505', nome: 'Kit festa, kit decoração e conjuntos personalizados para eventos', icmsInterno: 0.18, ipi: 0.15, tags: ['kit festa','kit decoração','kit aniversário','kit casamento','kit chá','kit natal','conjunto temático','caixa kit'], nota: 'ICMS 18% SP. IPI 15%.' },
  { id: '9501', nome: 'Kits e conjuntos de artesanato para presente', icmsInterno: 0.18, ipi: 0.00, tags: ['kit presente','cesta presente','kit brinde','kit personalizado','hamper','cestas'], nota: 'ICMS 18% SP. IPI 0%.' },

  // ── SUBLIMAÇÃO E PERSONALIZAÇÃO ──────────────────────────────────────────
  { id: '6301', nome: 'Cobertores e mantas sublimadas personalizadas', icmsInterno: 0.12, ipi: 0.00, tags: ['cobertor sublimado','manta sublimada','cobertor personalizado'], nota: 'ICMS 12% SP. IPI 0%.' },
  { id: '6302', nome: 'Toalhas, panos de prato e itens sublimados', icmsInterno: 0.12, ipi: 0.00, tags: ['toalha sublimada','pano prato sublimado','avental sublimado'], nota: 'ICMS 12% SP. IPI 0%.' },
  { id: '6911', nome: 'Canecas e cerâmica sublimada', icmsInterno: 0.18, ipi: 0.10, tags: ['caneca sublimada','caneca personalizada','xícara sublimada','prato sublimado'], nota: 'ICMS 18% SP. IPI 10%.' },
  { id: '3926', nome: 'Placas e artigos de acrílico sublimado/personalizado', icmsInterno: 0.18, ipi: 0.00, tags: ['placa acrílico','acrílico personalizado','sublimação acrílico','espelho acrílico'], nota: 'ICMS 18% SP. IPI 0%.' },

  // ── FLORES ARTIFICIAIS E NATURAIS ─────────────────────────────────────────
  { id: '6702', nome: 'Flores artificiais, folhagens e arranjos decorativos', icmsInterno: 0.18, ipi: 0.00, tags: ['flor artificial','flores secas','arranjo','bouquet','guirlanda','coroa flores','wreath','flor eva','flor seda'], nota: 'ICMS 18% SP. IPI 0%.' },
  { id: '0603', nome: 'Flores naturais e plantas para buquês e decoração', icmsInterno: 0.12, ipi: 0.00, tags: ['flor natural','buquê','planta decorativa','arranjo natural','flor de corte'], nota: 'ICMS 12% SP. IPI 0%.' },

  // ── SCRAPBOOK / ARTE ─────────────────────────────────────────────────────
  { id: '4823', nome: 'Papéis especiais para scrapbook, cardstock e texturizados', icmsInterno: 0.18, ipi: 0.00, tags: ['scrapbook','cardstock','papel texturizado','kraft','papel especial','papel estampado'], nota: 'ICMS 18% SP. IPI 0%.' },
  { id: '3919', nome: 'Adesivos decorativos, washi tape e fitas adesivas artísticas', icmsInterno: 0.18, ipi: 0.00, tags: ['washi tape','fita adesiva decorativa','adesivo decorativo','sticker adesivo','masking tape'], nota: 'ICMS 18% SP. IPI 0%.' },
]

// ── Busca por texto ──────────────────────────────────────────────────────────
function buscarNCM(query: string) {
  const q = query.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  
  const scored = NCM_ARTESANATO.map(ncm => {
    const nome  = ncm.nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    const tags  = ncm.tags.join(' ').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    const words = q.split(/\s+/)
    
    let score = 0
    for (const word of words) {
      if (word.length < 3) continue
      if (tags.includes(word))  score += 3
      if (nome.includes(word))  score += 2
      if (ncm.id.startsWith(word)) score += 1
    }
    return { ...ncm, score }
  })
  .filter(n => n.score > 0)
  .sort((a, b) => b.score - a.score)
  .slice(0, 4)
  .map(({ score: _, ...rest }) => rest)

  return scored
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    const { produto } = await req.json()
    if (!produto?.trim()) {
      return NextResponse.json({ error: 'Descrição obrigatória' }, { status: 400 })
    }

    const resultados = buscarNCM(produto)

    if (resultados.length === 0) {
      return NextResponse.json({
        ncms: [],
        mensagem: 'Nenhum NCM encontrado. Tente palavras mais específicas como: laço, caixa, tag, bordado, resina, etc.'
      })
    }

    return NextResponse.json({ ncms: resultados })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro ao buscar NCM' }, { status: 500 })
  }
}
