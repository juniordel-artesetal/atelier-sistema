import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// ─── Tabela NCM curada — Artesanato Brasileiro Completo ──────────────────────
// Baseada nas categorias do Elo7: Festas, Decoração, Papel, Roupas, Joias,
// Bijuterias, Bebê/Infantil, Bolsas, Técnicas, MDF, Casamento, Religiosos,
// Pets, Saúde/Beleza, Costura Criativa, Sublimação, Flores, Resina e mais.
// ─────────────────────────────────────────────────────────────────────────────
const NCM_TABLE = [

  // ══ PAPELARIA / IMPRESSOS ════════════════════════════════════════════════
  { id:'4909', nome:'Convites, cartões de aniversário, casamento e eventos impressos', icmsInterno:0.18, ipi:0.00,
    tags:['convite','cartão','postal','felicitação','aniversário','casamento','chá bebê','chá bar','batizado','formatura','save the date','convite digital impresso','convite personalizado'] },
  { id:'4910', nome:'Calendários, planners e organizadores impressos personalizados', icmsInterno:0.18, ipi:0.00,
    tags:['calendário','planner','agenda','organizador','bullet journal','caderno planejamento','planner personalizado','agenda impressa'] },
  { id:'4911', nome:'Tags, adesivos, etiquetas, rótulos e papelaria personalizada impressa', icmsInterno:0.18, ipi:0.00,
    tags:['tag','adesivo','etiqueta','rótulo','sticker','papelaria','chancela','logo impresso','tag personalizada','adesivo personalizado','kit papelaria','papelaria festa','tag presente'] },
  { id:'4819', nome:'Caixas, caixinhas e embalagens de papel/papelão personalizadas', icmsInterno:0.18, ipi:0.10,
    tags:['caixa','caixinha','embalagem','cofrinho papel','caixa presente','caixa mdf papel','packaging','caixa papelão','cx kraft','caixa kraft','caixa personalizada'] },
  { id:'4820', nome:'Cadernos, agendas, álbuns, diários e livros de assinaturas artesanais', icmsInterno:0.18, ipi:0.00,
    tags:['caderno','agenda','álbum','diário','scrapbook','encadernação','livro assinatura','álbum foto','caderno capa dura','mini álbum'] },
  { id:'4821', nome:'Etiquetas de papel ou cartão (todas espécies)', icmsInterno:0.18, ipi:0.00,
    tags:['etiqueta papel','label','tag papel','identificação','etiqueta produto'] },
  { id:'4823', nome:'Papel recortado, cardstock, cartolina e papel especial para artesanato', icmsInterno:0.18, ipi:0.00,
    tags:['papel recortado','cartolina','cardstock','scrap','eva','papel craft','kraft','papel estampado','papel texturizado','papel scrapbook'] },
  { id:'3919', nome:'Adesivos decorativos, washi tape, fita adesiva artística', icmsInterno:0.18, ipi:0.00,
    tags:['washi tape','fita adesiva','adesivo decorativo','masking tape','fita decorativa','adesivo parede','sticker adesivo'] },

  // ══ FESTAS / DECORAÇÃO DE EVENTOS ════════════════════════════════════════
  { id:'9505', nome:'Artigos de festa, toppers, enfeites e decoração para eventos', icmsInterno:0.18, ipi:0.15,
    tags:['topper','enfeite','artigo festa','kit festa','decoração festa','painel','balão','enfeite mesa','bandeirinha','guirlanda festa','decoração aniversário','decoração casamento','decoração formatura','decoração chá','decoração páscoa','decoração natal','decoração halloween','decoração junina','arraial','festa junina','centro mesa'] },
  { id:'4909', nome:'Convites e papelaria de casamento (save the date, cardápios, tags)', icmsInterno:0.18, ipi:0.00,
    tags:['papelaria casamento','convite casamento','save the date','cardápio casamento','tag padrinhos','lembrança casamento impresso','seating chart','menu casamento'] },
  { id:'3926', nome:'Itens de acrílico para decoração de festas (topos, placas, painéis)', icmsInterno:0.18, ipi:0.00,
    tags:['acrílico','topo bolo acrílico','placa acrílico','painel acrílico','espelho acrílico','letreiro acrílico','nome acrílico'] },

  // ══ LEMBRANCINHAS / BRINDES ═══════════════════════════════════════════════
  { id:'9501', nome:'Kits e conjuntos de lembrancinhas para eventos e festas', icmsInterno:0.18, ipi:0.00,
    tags:['lembrancinha','kit lembrancinha','mimo','brinde','presente','cesta presente','kit brinde','lembrancinha casamento','lembrancinha aniversário','lembrancinha chá','lembrancinha batizado','lembrancinha formatura','kit mimo','caixinha surpresa'] },
  { id:'4909', nome:'Lembrancinhas impressas (tags, cartões, certificados personalizados)', icmsInterno:0.18, ipi:0.00,
    tags:['tag lembrancinha','cartão agradecimento','certificado personalizado','diploma personalizado'] },

  // ══ DECORAÇÃO PARA CASA ════════════════════════════════════════════════════
  { id:'6304', nome:'Almofadas, capas de almofada e artigos decorativos de tecido', icmsInterno:0.12, ipi:0.00,
    tags:['almofada','capa almofada','cushion','travesseiro decorativo','almofada bordada','almofada personalizada','almofada sublimada'] },
  { id:'6302', nome:'Toalhas, panos de prato, guardanapos e enxoval de mesa bordado', icmsInterno:0.12, ipi:0.00,
    tags:['toalha','pano prato','guardanapo','enxoval mesa','toalha bordada','pano copa','avental','conjunto cozinha'] },
  { id:'6303', nome:'Cortinas, painéis de tecido e artigos para janelas artesanais', icmsInterno:0.12, ipi:0.00,
    tags:['cortina','painel','bandô','valance','cortina bordada','cortina personalizada'] },
  { id:'4420', nome:'Objetos decorativos de madeira (tábuas, bandejas, bowls, totens)', icmsInterno:0.18, ipi:0.10,
    tags:['objeto madeira','enfeite madeira','escultura madeira','totem','porta vela madeira','bandeja madeira','bowl madeira','tábua personalizada','porta-retrato madeira','letreiro madeira','letra madeira','inicial madeira'] },
  { id:'4421', nome:'Artefatos de MDF, compensado e placa de madeira personalizada (corte laser)', icmsInterno:0.18, ipi:0.00,
    tags:['mdf','compensado','placa madeira','fundo mdf','peça mdf','corte laser','laser madeira','mdf personalizado','porta-chave mdf','chaveiro mdf'] },
  { id:'6913', nome:'Estatuetas, miniaturas e enfeites de biscuit/cerâmica para decoração', icmsInterno:0.18, ipi:0.00,
    tags:['estatueta','miniatura','boneco biscuit','enfeite cerâmica','figura decorativa','escultura biscuit','boneco porcelana fria','topo bolo biscuit'] },
  { id:'6912', nome:'Artigos de biscuit, cerâmica fria, argila e porcelana fria', icmsInterno:0.18, ipi:0.00,
    tags:['biscuit','cerâmica fria','argila','porcelana fria','pasta americana','gesso artesanal','cold porcelain'] },
  { id:'7013', nome:'Objetos de vidro decorativos (vasos, garrafas, terrários, vitral)', icmsInterno:0.18, ipi:0.15,
    tags:['vidro','vaso vidro','garrafa decorativa','terrário','vitral','garrafa pintada','jarra vidro','lanterna vidro'] },
  { id:'3926', nome:'Artigos de resina epóxi (bandejas, chaveiros, quadros, porta-retratos)', icmsInterno:0.18, ipi:0.00,
    tags:['resina','epóxi','resina epóxi','bandeja resina','chaveiro resina','quadro resina','arte resina','geodo resina','relógio resina','mesa resina'] },
  { id:'9405', nome:'Luminárias, abajures e luminários artesanais personalizados', icmsInterno:0.18, ipi:0.10,
    tags:['luminária','abajur','luminário','lustre artesanal','luz led personalizada','luminária mdf','luminária crochê','luminária macramê'] },
  { id:'4414', nome:'Quadros, molduras e porta-retratos artesanais', icmsInterno:0.18, ipi:0.10,
    tags:['quadro','moldura','porta-retrato','quadro decorativo','quadro personalizado','quadro família','quadro frase','quadro mapa','quadro aquarela','arte impressa','poster'] },

  // ══ COSTURA CRIATIVA / TÊXTEIS ════════════════════════════════════════════
  { id:'6217', nome:'Laços, acessórios de cabelo e artigos de costura em tecido', icmsInterno:0.12, ipi:0.00,
    tags:['laço','laço cabelo','laço presente','laço cetim','laço gorgurão','laço bebê','laço duplo','laço de fita','laço personalizado','faixa cabelo','tiara','headband','scrunchie','xuxinha','elástico cabelo','acessório cabelo'] },
  { id:'6214', nome:'Xales, lenços, turbantes, echarpes e acessórios de pescoço', icmsInterno:0.12, ipi:0.00,
    tags:['xale','lenço','echarpe','bandana','turbante','gola','snood','infinity scarf'] },
  { id:'6001', nome:'Artigos de pelúcia, plush, soft e fleece (tecidos de pelo)', icmsInterno:0.12, ipi:0.00,
    tags:['pelúcia','plush','soft','fleece','tecido pelo','pelo alto','velboa'] },
  { id:'5811', nome:'Colchas, quilts, mantas patchwork e acolchoados artesanais', icmsInterno:0.12, ipi:0.00,
    tags:['patchwork','quilt','colcha patchwork','manta patchwork','quilting','acolchoado','matelassê','capitonê'] },
  { id:'5601', nome:'Enchimentos, mantas acrílicas e fibra siliconada para artesanato', icmsInterno:0.12, ipi:0.00,
    tags:['enchimento','manta acrílica','fibra siliconada','pluma','wadding','batting','silicone enchimento','poly fill'] },
  { id:'6307', nome:'Necessaires, estojos, porta-objetos e bolsas artesanais de tecido', icmsInterno:0.12, ipi:0.00,
    tags:['necessaire','porta objetos','organizador tecido','estojo','frasqueira','porta lápis','porta maquiagem','porta moeda','carteira tecido'] },
  { id:'6305', nome:'Sacolas, ecobags e bags personalizadas de tecido', icmsInterno:0.12, ipi:0.00,
    tags:['sacola tecido','ecobag','bag personalizada','saco algodão','sacola juta','sacola linho','tote bag','sacola personalizada'] },
  { id:'5806', nome:'Fitas, vieses, passamanarias, rendas e bordados por metro', icmsInterno:0.12, ipi:0.00,
    tags:['fita','viés','passamanaria','galão','renda','entremeio','bordado por metro','franja','paetê','cadarço','fita cetim','fita gorgurão'] },
  { id:'5810', nome:'Bordados em peça, apliques e motivos bordados', icmsInterno:0.12, ipi:0.00,
    tags:['bordado','aplicação bordada','motivo bordado','brasão','emblema bordado','bordado livre','bordado ponto cruz','bordado inglês','richelieu','hardanger'] },
  { id:'5807', nome:'Etiquetas de tecido, patches, apliques termocolantes e woven labels', icmsInterno:0.12, ipi:0.00,
    tags:['patch','aplique','woven label','etiqueta tecido','termocolante','patch bordado','patches','aplique termocolante'] },
  { id:'6308', nome:'Kits de costura, patchwork, crochê, bordado e artesanato em tecido', icmsInterno:0.12, ipi:0.00,
    tags:['kit costura','kit patchwork','kit crochê','kit bordado','kit amigurumi','kit artesanato','kit bordado','kit ponto cruz'] },

  // ══ CROCHÊ / TRICÔ / AMIGURUMI / MACRAMÊ ═════════════════════════════════
  { id:'9503', nome:'Bonecos, amigurumis, pelúcias e brinquedos artesanais de crochê/pano', icmsInterno:0.18, ipi:0.10,
    tags:['amigurumi','boneco crochê','boneco pano','boneca pano','bicho crochê','pelúcia artesanal','boneco tricô','boneco feltro','personagem crochê'] },
  { id:'6116', nome:'Luvas, mitenes e artigos de mão em crochê/tricô', icmsInterno:0.12, ipi:0.00,
    tags:['luva crochê','mitene','luva tricô','dedeira','polegar crochê'] },
  { id:'6111', nome:'Vestuário bebê e infantil em crochê/tricô (sapatinhos, toucas, conjuntos)', icmsInterno:0.12, ipi:0.00,
    tags:['sapatinho crochê','touca crochê','conjunto bebê crochê','roupa bebê crochê','macacão crochê','mantinha crochê'] },
  { id:'5609', nome:'Macramê, wall art, dreamcatcher e artigos de cordas decorativos', icmsInterno:0.12, ipi:0.00,
    tags:['macramê','wall art','dreamcatcher','filtro dos sonhos','tapeçaria','porta vaso macramê','cortina macramê','macramê parede','nó macramê'] },
  { id:'6301', nome:'Cobertores, mantas e artigos de agasalho em crochê/tricô', icmsInterno:0.12, ipi:0.00,
    tags:['cobertor crochê','manta crochê','manta tricô','manta bebê','manta decorativa','throw crochê'] },
  { id:'5205', nome:'Fios de algodão para crochê, tricô e macramê (novelos, barbante)', icmsInterno:0.12, ipi:0.00,
    tags:['fio algodão','novelo','barbante','cordão algodão','macramê fio','crochê fio','tricô fio','fio amigurumi'] },
  { id:'5508', nome:'Fios e linhas sintéticas (poliéster, nylon, acrílico) para artesanato', icmsInterno:0.12, ipi:0.00,
    tags:['fio acrílico','linha nylon','fio poliéster','fio sintético','linha overlock','fio de malha'] },
  { id:'5606', nome:'Fios metalizados, lurex e chenille para artesanato', icmsInterno:0.12, ipi:0.00,
    tags:['lurex','metalizado','chenille','fio glitter','fio brilho','fio metalizado'] },

  // ══ JOIAS E BIJUTERIAS ════════════════════════════════════════════════════
  { id:'7117', nome:'Bijuterias (colares, pulseiras, brincos, anéis em metais não preciosos)', icmsInterno:0.18, ipi:0.10,
    tags:['bijuteria','colar','pulseira','brinco','anel','bracelete','pingente','argola','choker','gargantilha','tornozeleira','conjunto bijuteria','bijuteria personalizada'] },
  { id:'7113', nome:'Joias em prata 925, ouro e metais preciosos artesanais', icmsInterno:0.18, ipi:0.00,
    tags:['joia','prata 925','prata','ouro','folheado','banho ouro','joia personalizada','anel prata','colar prata','brinco prata','pulseira prata','nome em prata'] },
  { id:'7116', nome:'Artigos com pérolas, pedras naturais e semipreciosas (bijuteria)', icmsInterno:0.18, ipi:0.00,
    tags:['pérola','pedra natural','semipreciosa','cristal','ágata','quartzo','howlita','pedra rolada','jaspe','labradorita','turquesa','olho de tigre'] },
  { id:'8308', nome:'Fechos metálicos, bases, ilhós e componentes para bijuteria', icmsInterno:0.18, ipi:0.05,
    tags:['fecho metal','base anel','base brinco','ilhós metal','gancho brinco','argola metal','mosquetão','pino metal','base broche','componente bijuteria'] },

  // ══ MODA / ROUPAS ARTESANAIS ═══════════════════════════════════════════════
  { id:'6109', nome:'Camisetas, camisas e tops artesanais/personalizados em malha', icmsInterno:0.12, ipi:0.00,
    tags:['camiseta','camisa','top','camiseta personalizada','camiseta sublimada','baby look','regata','tie dye'] },
  { id:'6104', nome:'Vestidos, saias e conjuntos femininos artesanais em tecido', icmsInterno:0.12, ipi:0.00,
    tags:['vestido','saia','conjunto feminino','vestido artesanal','vestido bordado','saia bordada','vestido festa','vestido noiva'] },
  { id:'6110', nome:'Blusas, casaquinhos e pulôveres de crochê/tricô', icmsInterno:0.12, ipi:0.00,
    tags:['blusa crochê','casaquinho','pulôver','blusa tricô','cardigan crochê','casaquinho bebê'] },
  { id:'6117', nome:'Chapéus, bonés, gorros, toucas e acessórios de cabeça artesanais', icmsInterno:0.12, ipi:0.00,
    tags:['chapéu','boné','gorro','touca','beanie','bucket hat','chapéu palha','chapéu crochê'] },
  { id:'6402', nome:'Chinelos, sandálias e calçados artesanais decorados', icmsInterno:0.18, ipi:0.10,
    tags:['chinelo','sandália','calçado artesanal','chinelo personalizado','sandália artesanal','rasteirinha'] },

  // ══ BEBÊ E INFANTIL ════════════════════════════════════════════════════════
  { id:'6111', nome:'Enxoval de bebê (bodies, macacões, pagãozinhos em tecido artesanal)', icmsInterno:0.12, ipi:0.00,
    tags:['enxoval bebê','body','macacão','pagãozinho','roupa bebê','kit enxoval','roupinha bebê','mameluco'] },
  { id:'9503', nome:'Brinquedos educativos, tapetes sensoriais e móbiles artesanais', icmsInterno:0.18, ipi:0.10,
    tags:['brinquedo educativo','tapete sensorial','móbile','chocalho','mordedor','brinquedo pedagógico','tapete atividades','brinquedo bebê'] },
  { id:'6304', nome:'Almofadas, naninha, travesseiros e artigos de conforto para bebê', icmsInterno:0.12, ipi:0.00,
    tags:['naninha','almofada bebê','travesseiro bebê','nuvem bebê','kit berço','protetor berço','saia berço'] },
  { id:'6214', nome:'Faixas, tiaras e acessórios de cabelo para bebê', icmsInterno:0.12, ipi:0.00,
    tags:['faixa bebê','tiara bebê','headband bebê','laço bebê','acessório cabelo bebê'] },
  { id:'4909', nome:'Convites e papelaria para chá de bebê, chá bar e maternidade', icmsInterno:0.18, ipi:0.00,
    tags:['convite chá bebê','chá bar','chá de fralda','papelaria maternidade','convite maternidade','kit digital chá'] },
  { id:'6302', nome:'Toalhas de banho, capas de banho e fraldinhas bordadas para bebê', icmsInterno:0.12, ipi:0.00,
    tags:['toalha bebê','capa banho','fraldinha','toalha com capuz','kit banho bebê','toalhinha bordada'] },

  // ══ BOLSAS E CARTEIRAS ════════════════════════════════════════════════════
  { id:'4202', nome:'Bolsas, mochilas, carteiras e acessórios de couro ou sintético artesanais', icmsInterno:0.18, ipi:0.10,
    tags:['bolsa','mochila','carteira','clutch','pochete','bolsa couro','bolsa artesanal','bolsa personalizada','porta-cartão','porta-documentos'] },
  { id:'6307', nome:'Bolsas, totes e sacolas artesanais de tecido', icmsInterno:0.12, ipi:0.00,
    tags:['bolsa tecido','tote bag','sacola artesanal','bolsa juta','bolsa lona','bolsa crochê','bolsa tricô','bolsa macramê'] },

  // ══ CASAMENTO ═════════════════════════════════════════════════════════════
  { id:'6702', nome:'Buquês, arranjos florais, coroas de flores e decoração floral para casamento', icmsInterno:0.18, ipi:0.00,
    tags:['buquê','arranjo floral','coroa flores','decoração floral','flores casamento','flores noiva','laço buquê','bouquet'] },
  { id:'9505', nome:'Itens de decoração para mesa de casamento (centro de mesa, enfeites)', icmsInterno:0.18, ipi:0.15,
    tags:['centro mesa casamento','enfeite casamento','decoração mesa casamento','arranjo centro mesa'] },
  { id:'7113', nome:'Alianças, anéis de noivado e joias para casamento', icmsInterno:0.18, ipi:0.00,
    tags:['aliança','anel noivado','par alianças','aliança casamento','anel de compromisso'] },
  { id:'6104', nome:'Vestido de noiva, vestido de debutante e trajes artesanais para eventos', icmsInterno:0.12, ipi:0.00,
    tags:['vestido noiva','vestido debutante','vestido festa','vestido dama','roupa casamento','traje festa'] },

  // ══ RELIGIOSOS ════════════════════════════════════════════════════════════
  { id:'9602', nome:'Imagens religiosas, santos e artigos sacros em biscuit/resina', icmsInterno:0.12, ipi:0.00,
    tags:['imagem religiosa','santo','nossa senhora','são josé','sagrado coração','artigo sacro','imagem biscuit','imagem resina','santa','crucifixo'] },
  { id:'7117', nome:'Terços, rosários e pulseiras religiosas artesanais', icmsInterno:0.18, ipi:0.00,
    tags:['terço','rosário','pulseira religiosa','dezena','cordão são bento','escapulário','medalha religiosa'] },
  { id:'4909', nome:'Cartões e papelaria religiosa (santinhos, certificados de batismo)', icmsInterno:0.18, ipi:0.00,
    tags:['santinho','cartão religioso','certificado batismo','lembrança primeira comunhão','cartão primeira eucaristia'] },

  // ══ PETS ══════════════════════════════════════════════════════════════════
  { id:'6117', nome:'Roupas, acessórios e fantasias artesanais para pets', icmsInterno:0.18, ipi:0.00,
    tags:['roupa pet','fantasia pet','roupa cachorro','roupa gato','acessório pet','laço pet','gravata pet','vestuário animal'] },
  { id:'9404', nome:'Caminhas, almofadas e artigos de descanso para pets artesanais', icmsInterno:0.18, ipi:0.00,
    tags:['caminha pet','almofada pet','cama cachorro','cama gato','casinha pet','cama animal','colchão pet'] },
  { id:'4909', nome:'Tags e plaquinhas de identificação para pets', icmsInterno:0.18, ipi:0.00,
    tags:['tag pet','plaquinha identificação pet','identificação cachorro','tag personalizada pet','plaquinha nome pet'] },

  // ══ SAÚDE E BELEZA ════════════════════════════════════════════════════════
  { id:'3401', nome:'Sabonetes artesanais, cold process e saboaria natural', icmsInterno:0.18, ipi:0.00,
    tags:['sabonete','sabonete artesanal','cold process','saboaria','sabão natural','glicerina','sabonete vegano','sabonete artesanal mel','sabonete ervas'] },
  { id:'3406', nome:'Velas decorativas, aromáticas, de soja e artesanais', icmsInterno:0.18, ipi:0.00,
    tags:['vela','vela aromática','vela decorativa','vela soja','vela parafina','vela gel','vela personalizada','vela aromaterapia','vela container','vela pilar'] },
  { id:'3307', nome:'Sachês perfumados, difusores, home spray e aromatizadores artesanais', icmsInterno:0.25, ipi:0.10,
    tags:['sachê','difusor','home spray','aromatizador','água perfumada','potpourri','difusor varetas','spray ambiente'] },
  { id:'3305', nome:'Produtos artesanais para cabelo (máscaras, cremes, leave-in naturais)', icmsInterno:0.25, ipi:0.10,
    tags:['máscara cabelo','creme cabelo','leave-in','finalizador','shampoo artesanal','condicionador artesanal','óleo capilar'] },
  { id:'3304', nome:'Cosméticos artesanais (batons naturais, pó de arroz, blush natural)', icmsInterno:0.25, ipi:0.10,
    tags:['batom natural','cosmético artesanal','blush natural','pó de arroz','makeup natural','lip balm','protetor labial'] },

  // ══ SUBLIMAÇÃO E PERSONALIZAÇÃO ══════════════════════════════════════════
  { id:'6911', nome:'Canecas, xícaras e cerâmicas sublimadas e personalizadas', icmsInterno:0.18, ipi:0.10,
    tags:['caneca sublimada','caneca personalizada','xícara sublimada','prato sublimado','cerâmica personalizada','caneca foto','caneca frase','copo personalizado'] },
  { id:'6302', nome:'Toalhas, panos de prato e têxteis sublimados personalizados', icmsInterno:0.12, ipi:0.00,
    tags:['toalha sublimada','pano prato sublimado','avental sublimado','toalha personalizada'] },
  { id:'6301', nome:'Cobertores e mantas sublimadas personalizadas', icmsInterno:0.12, ipi:0.00,
    tags:['cobertor sublimado','manta sublimada','cobertor personalizado','manta foto','manta frase'] },
  { id:'6109', nome:'Camisetas, baby looks e vestuário sublimado personalizado', icmsInterno:0.12, ipi:0.00,
    tags:['camiseta sublimada','baby look sublimada','camiseta personalizada','camisa personalizada','regata sublimada','camiseta foto'] },

  // ══ MDF E MADEIRA ═════════════════════════════════════════════════════════
  { id:'4421', nome:'Peças de MDF cortadas a laser (kits, caixas, porta-treco, letras)', icmsInterno:0.18, ipi:0.00,
    tags:['mdf','corte laser','mdf personalizado','caixa mdf','letra mdf','kit mdf','porta-treco mdf','cabide mdf','porta-chave mdf','plaquinha mdf','display mdf','organizador mdf'] },
  { id:'4420', nome:'Artigos decorativos de madeira torneada, entalhada e pintada', icmsInterno:0.18, ipi:0.10,
    tags:['madeira torneada','entalhe','madeira pintada','objeto madeira pintado','porta-joias madeira','espelho madeira','relógio madeira'] },
  { id:'4602', nome:'Cestaria, trançados e artigos de vime, bambu, palha e rattan', icmsInterno:0.18, ipi:0.00,
    tags:['cesto','cestaria','vime','bambu','palha','trança palha','rattan','cesta organização','vaso palha'] },

  // ══ ARTES PLÁSTICAS / PINTURA ════════════════════════════════════════════
  { id:'9701', nome:'Pinturas artísticas e obras de arte originais artesanais', icmsInterno:0.00, ipi:0.00,
    tags:['pintura','obra arte','aquarela','tela pintada','arte original','pintura a óleo','pintura acrílica','arte autoral','quadro pintado à mão'] },
  { id:'3208', nome:'Tintas acrílicas, vernizes e esmaltes para artesanato', icmsInterno:0.18, ipi:0.08,
    tags:['tinta acrílica','tinta pva','verniz','esmalte','tinta tecido','tinta vitral','tinta decoupage'] },
  { id:'3212', nome:'Glitter, purpurina, pigmentos e corantes artesanais', icmsInterno:0.18, ipi:0.00,
    tags:['glitter','purpurina','pigmento','corante','mica','pó metálico','glitter resina'] },

  // ══ FLORES ARTIFICIAIS E NATURAIS ════════════════════════════════════════
  { id:'6702', nome:'Flores artificiais, secas, desidratadas, arranjos e guirlandas decorativas', icmsInterno:0.18, ipi:0.00,
    tags:['flor artificial','flores secas','flor desidratada','arranjo','guirlanda','wreath','coroa flores','buquê artificial','flor eva','flor seda','flor papel','arranjo seco'] },
  { id:'0603', nome:'Flores naturais e plantas para corte, buquês e decoração', icmsInterno:0.12, ipi:0.00,
    tags:['flor natural','buquê natural','planta decorativa','flor de corte','flor do campo'] },

  // ══ AVIAMENTOS E ARMARINHO ═══════════════════════════════════════════════
  { id:'9606', nome:'Botões, ilhós, colchetes, pressões e fechos para costura', icmsInterno:0.18, ipi:0.10,
    tags:['botão','ilhós','colchete','pressão','snap','fivela','gancho','botão de pressão'] },
  { id:'9607', nome:'Zíperes e fechos de correr para costura artesanal', icmsInterno:0.18, ipi:0.10,
    tags:['zíper','zipper','fecho eclair','fecho de correr','zíper emborrachado','zíper nylon'] },
  { id:'5607', nome:'Elásticos para costura e artesanato', icmsInterno:0.12, ipi:0.00,
    tags:['elástico','elástico chato','elástico redondo','elástico cadarço','elástico liso'] },
  { id:'5204', nome:'Linhas de costura de algodão e bordado', icmsInterno:0.12, ipi:0.00,
    tags:['linha costura','linha algodão','linha bordado','linha ponto cruz','mouliné','fio bordado'] },
  { id:'5208', nome:'Tecidos de algodão (tricoline, oxford, linho, chitão, percal)', icmsInterno:0.12, ipi:0.00,
    tags:['tecido algodão','tricoline','oxford','linho','chitão','percal','estampado','atoalhado','piquet','musselina'] },
  { id:'5007', nome:'Tecidos nobres (cetim, chiffon, organza, voal, seda)', icmsInterno:0.12, ipi:0.00,
    tags:['cetim','chiffon','organza','voal','seda','viscose','charmeuse','tecido festeiro'] },
  { id:'5407', nome:'Tecidos sintéticos (tule, nylon, poliéster, helanca, lycra)', icmsInterno:0.12, ipi:0.00,
    tags:['tule','nylon','poliéster','helanca','lycra','malha','suplex','meia malha'] },

  // ══ COURO E SINTÉTICOS ════════════════════════════════════════════════════
  { id:'4205', nome:'Artefatos artesanais em couro legítimo (bolsas, cintos, porta-chaves)', icmsInterno:0.18, ipi:0.00,
    tags:['couro','artesanato couro','cinto couro','bolsa couro','porta-chave couro','carteira couro','colar couro','pulseira couro'] },
  { id:'3926', nome:'Artigos artesanais em couro sintético (courino, PU, corino)', icmsInterno:0.18, ipi:0.00,
    tags:['courino','corino','couro sintético','couro PU','couro ecológico','laço courino','tiara courino'] },

  // ══ CERÂMICA E PORCELANA ═════════════════════════════════════════════════
  { id:'6911', nome:'Louças, pratos, xícaras e artigos de porcelana/cerâmica para mesa', icmsInterno:0.18, ipi:0.10,
    tags:['cerâmica','porcelana','louça','caneca cerâmica','prato decorativo','xícara','travessa','bowl cerâmica'] },
  { id:'6913', nome:'Enfeites e estatuetas de cerâmica e porcelana para decoração', icmsInterno:0.18, ipi:0.00,
    tags:['enfeite cerâmica','estatueta cerâmica','figura cerâmica','decoração cerâmica','cachepot cerâmico'] },
]

// ── Busca inteligente por texto ───────────────────────────────────────────────
function buscarNCM(query: string) {
  const normalize = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  const q = normalize(query)
  const words = q.split(/\s+/).filter(w => w.length >= 3)

  // Remove duplicatas por id (mantém o de maior score)
  const seen = new Map<string, { ncm: typeof NCM_TABLE[0]; score: number }>()

  for (const ncm of NCM_TABLE) {
    const nome = normalize(ncm.nome)
    const tags = normalize(ncm.tags.join(' '))
    let score = 0

    for (const word of words) {
      if (tags.includes(word))  score += 3  // tag exata tem mais peso
      if (nome.includes(word))  score += 2  // nome do NCM
    }
    // Bonus: query inteira encontrada nas tags
    if (tags.includes(q)) score += 5

    if (score > 0) {
      const existing = seen.get(ncm.id)
      if (!existing || score > existing.score) {
        seen.set(ncm.id, { ncm, score })
      }
    }
  }

  return Array.from(seen.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map(({ ncm }) => ({
      id: ncm.id,
      nome: ncm.nome,
      icmsInterno: ncm.icmsInterno,
      ipi: ncm.ipi,
      nota: `ICMS ${(ncm.icmsInterno * 100).toFixed(0)}% (alíquota interna). IPI ${(ncm.ipi * 100).toFixed(0)}%. Consulte seu contador para confirmar a classificação.`,
    }))
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

    return NextResponse.json({
      ncms: resultados,
      mensagem: resultados.length === 0
        ? 'Nenhum NCM encontrado. Tente palavras como: laço, caixa, bordado, resina, caneca, vela, bijuteria, etc.'
        : null
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro ao buscar NCM' }, { status: 500 })
  }
}
