import React, { useEffect, useMemo, useRef, useState } from "react";
import resolveBrowserLanguage from "../utils/resolveBrowserLanguage";

const FOCUS_SECTION_IDS = {
  es: { privacy: "es-privacidad", cookies: "es-cookies" },
  en: { privacy: "en-privacy", cookies: "en-cookies" },
};

const COOKIE_ROWS_ES = [
  ["playforge_cookie_consent", "Dominio actual", "Guardar las preferencias de consentimiento del usuario.", "180 dias", "Cookie tecnica propia"],
  ["playforge.cookieConsent.v1", "Dominio actual", "Guardar una copia local de las preferencias de consentimiento.", "180 dias", "Almacenamiento local tecnico propio"],
  ["localStorage de juegos", "Dominio actual", "Guardar partidas, records, progreso o ajustes locales de juegos.", "Persistente hasta borrado del navegador", "Almacenamiento funcional propio"],
  ["preferencias locales", "Dominio actual", "Recordar idioma, experiencia o ajustes de visualizacion si se habilitan.", "Persistente hasta borrado del navegador", "Preferencias propias"],
  ["_ga, _ga_<id>", "Google Analytics", "Distinguir usuarios y sesiones si se activa Google Analytics con consentimiento de analitica.", "Hasta 2 anos", "Cookie de analitica de terceros"],
  ["AdSense / GTM", "Google", "Publicidad y medicion de anuncios si se activa Google AdSense o Google Tag Manager con consentimiento de publicidad.", "Segun proveedor", "Cookie o almacenamiento publicitario de terceros"],
  ["Amazon Afiliados", "Proveedor externo", "Medicion de enlaces de afiliacion si se activa Amazon Afiliados con consentimiento de afiliacion.", "Segun proveedor", "Cookie, parametro o almacenamiento de afiliacion de terceros"],
];

const COOKIE_ROWS_EN = [
  ["playforge_cookie_consent", "Current domain", "Store the user's consent preferences.", "180 days", "First-party technical cookie"],
  ["playforge.cookieConsent.v1", "Current domain", "Store a local copy of consent preferences.", "180 days", "First-party technical local storage"],
  ["Game localStorage", "Current domain", "Store game saves, records, progress or local game settings.", "Persistent until browser deletion", "First-party functional storage"],
  ["Local preferences", "Current domain", "Remember language, experience or display settings if enabled.", "Persistent until browser deletion", "First-party preferences"],
  ["_ga, _ga_<id>", "Google Analytics", "Distinguish users and sessions if Google Analytics is enabled with analytics consent.", "Up to 2 years", "Third-party analytics cookie"],
  ["AdSense / GTM", "Google", "Advertising and ad measurement if Google AdSense or Google Tag Manager is enabled with advertising consent.", "Set by provider", "Third-party advertising cookie or storage"],
  ["Amazon Associates", "External provider", "Affiliate link measurement if Amazon Associates is enabled with affiliate consent.", "Set by provider", "Third-party affiliate cookie, parameter or storage"],
];

const ES_SECTIONS = [
  {
    id: "es-aviso",
    title: "1. AVISO LEGAL",
    blocks: [
      { type: "p", text: "En cumplimiento con el artículo 10.1 de la Ley 34/2002, de 11 de julio, de Servicios de la Sociedad de la Información y Comercio Electrónico (LSSI) se indican los datos identificativos del titular:" },
      {
        type: "list",
        items: [
          "Responsable: Hugo E.G. (en adelante, “GameLock”)",
          "Correo electrónico: gamelockweb@gmail.com",
          "Identificación de la web: www.gamelock.es",
          "Apartado de correos: 636",
          "Código Postal: 15704",
        ],
      },
    ],
  },
  {
    id: "es-privacidad",
    title: "2. POLÍTICA DE PRIVACIDAD",
    blocks: [
      { type: "p", text: "Mediante la presente Política de Privacidad, el usuario queda informado de una forma clara, precisa y concisa. Si el usuario la acepta, nos dará su consentimiento de una forma libre, informada, específica e inequívoca para que GameLock trate sus datos personales, conforme al Reglamento UE 2016/679 relativo a la protección de las personas físicas, mediante el tratamiento de sus datos personales y su libre circulación (RGPD) y la Ley Orgánica 3/2018, del 5 de diciembre, de Protección de Datos Personales y garantía de los derechos digitales (LOPDGDD) (legislación europea y nacional vigente sobre materia de protección de datos)." },
      { type: "h3", text: "2.1 INFORMACIÓN BÁSICA SOBRE PROTECCIÓN DE DATOS" },
      {
        type: "table",
        head: ["Apartado", "Detalle"],
        rows: [
          ["Responsable del tratamiento", "GameLock"],
          ["Finalidades del tratamiento", "Respuesta a consultas y dudas, prestación del servicio y posible envío de información sobre los productos y servicios."],
          ["Legitimación", "Consentimiento del interesado y relación con GameLock (artículo 6.1,a del RGPD y artículo 6.1,b del RGPD)."],
          ["Destinatarios", "No se cederán datos a terceros. Podrán tener acceso: Fuerzas y Cuerpos de Seguridad, Encargados del Tratamiento necesarios para la prestación del servicio."],
          ["Derechos e información adicional", "Se permite el ejercicio de los derechos de acceso, rectificación o supresión, entre otros. Toda la información se encuentra accesible en la información detallada de esta política de privacidad."],
        ],
      },
      { type: "h3", text: "2.2 INFORMACIÓN DETALLADA SOBRE PROTECCIÓN DE DATOS" },
      { type: "h4", text: "2.2.1 ¿Quién es el responsable del tratamiento?" },
      { type: "p", text: "Los datos identificativos del Responsable del Tratamiento aparecen en el apartado 1." },
      { type: "h4", text: "2.2.2 ¿Qué información recopilamos y tratamos del usuario a través de la página web?" },
      { type: "p", text: "Los datos que se recaban se refieren a la categoría de datos identificativos, como pueden ser: Nombre y Apellidos, Correo electrónico, así como la dirección IP desde donde accede al formulario de recogida de datos." },
      {
        type: "list",
        items: [
          "A través del formulario Contacto. En nuestra página web el usuario encontrará la opción de escribirnos para aclarar todas las dudas que tenga en relación con el funcionamiento de nuestros productos/servicios o cualquier otra cosa que necesite. Para contestar, contactaremos con el usuario a través del correo electrónico o número de teléfono, si nos lo hubiera indicado.",
          "A través de nuestro email corporativo. A través de nuestro correo electrónico gamelockweb@gmail.com el usuario podrá escribirnos y/o requerir la información que considere necesaria para aclarar las dudas relacionadas con nuestros servicios.",
          "A través de los comentarios en el blog. También podremos visualizar datos del usuario por comentarios que pueda escribir en los artículos de nuestro blog. Para poder realizar un comentario solicitaremos un nombre y un correo electrónico.",
          "A través de los Mini juegos interactivos. En determinados mini juegos se pueden solicitar datos de identificación (nombre o alias) y, en su caso, dirección de correo electrónico, con el fin de registrar la participación, guardar puntuaciones o mostrar resultados. Estos datos podrán utilizarse para elaborar clasificaciones internas y mostrar rankings, siempre que el usuario haya aceptado las condiciones de participación.",
          "A través de Encuestas, quizzes y rankings. En encuestas, cuestionarios o quizzes que generan rankings de usuarios, se puede recopilar información como nombre o alias, dirección de correo electrónico (si se requiere registro), respuestas aportadas y resultados obtenidos. Estos datos se emplean exclusivamente para fines estadísticos, elaboración de clasificaciones y mejora de la experiencia del usuario en el sitio.",
        ],
      },
      { type: "p", text: "En el caso de que el usuario nos facilite datos de terceros, asumirá la responsabilidad de haberle informado previamente y tener su consentimiento para ello, conforme al artículo 14 del RGPD." },
      { type: "h4", text: "2.2.3 ¿Con qué finalidad tratamos los datos personales del usuario?" },
      { type: "p", text: "GameLock realiza un tratamiento de datos personales con las finalidades que se exponen a continuación, en función del motivo para el que hayan sido facilitados:" },
      { type: "list", items: ["Contactar, tramitar, gestionar y dar respuesta a la petición, solicitud, incidencia o consulta del usuario (ya sea a través de correo electrónico, formulario de contacto o teléfono).", "Gestionar, en su caso, el envío de información sobre novedades asociadas a GameLock por medios electrónicos y/o convencionales."] },
      { type: "h4", text: "2.2.4 ¿Cuál es la legitimación del tratamiento de los datos del usuario?" },
      { type: "list", items: ["Para poder aprovechar los servicios ofertados a través de la página web, así como el registro de usuario, la legitimación es la relación contractual con GameLock y la aceptación de sus condiciones de uso, por ello, el tratamiento de datos se realiza en base al artículo 6.1,b del RGPD.", "En lo que respecta al envío de información sobre productos, servicios y novedades asociadas a GameLock, la base legal para el tratamiento de los datos personales facilitados es el consentimiento que otorga el usuario de forma expresa, tal y como establece el artículo 6.1,a) del RGPD."] },
      { type: "h4", text: "2.2.5 ¿Durante cuánto tiempo se tratarán los datos personales del usuario?" },
      { type: "list", items: ["Los datos de los usuarios registrados, gestión de consultas y solicitudes se conservarán durante el tiempo necesario para dar respuesta a los mismos, y en su caso, mientras el interesado no solicite la retirada de su consentimiento para enviarle información relacionada con su consulta.", "Los datos para el envío de información asociada a las novedades de GameLock serán conservados mientras el usuario no revoque su consentimiento."] },
      { type: "h4", text: "2.2.6 ¿A qué destinatarios se comunicarán los datos personales del usuario?" },
      { type: "p", text: "Como regla general, sus datos no serán cedidos a terceros salvo que existe una obligación legal o sea necesario para llevar a cabo la prestación del servicio. Teniendo esto en cuenta:" },
      { type: "list", items: ["Únicamente en casos necesarios legalmente, los datos serán comunicados a las Fuerzas y Cuerpos de Seguridad del Estado.", "También podrían ser comunicados a las Administraciones Públicas competentes en los casos previstos por la Ley.", "En su caso, también serán comunicados a los Encargados del Tratamiento de GameLock para la correcta prestación del servicio."] },
      { type: "h4", text: "2.2.7 ¿Cuáles son los derechos del usuario?" },
      { type: "p", text: "La normativa en materia de protección de datos permite que pueda ejercer sus derechos de acceso, rectificación, supresión y portabilidad de datos y oposición y limitación a su tratamiento, así como a no ser objeto de decisiones basadas únicamente en el tratamiento automatizado de sus datos, cuando proceda." },
      { type: "p", text: "Estos derechos se caracterizan por lo siguiente:" },
      { type: "list", items: ["Su ejercicio es gratuito, salvo que se trate de solicitudes manifiestamente infundadas o excesivas (p. ej., carácter repetitivo), en cuyo caso GameLock podrá cobrar un canon proporcional a los costes administrativos soportados o negarse a actuar.", "Puede ejercer los derechos directamente o por medio de su representante legal o voluntario.", "Debemos responder a su solicitud en el plazo de un mes, aunque, si se tiene en cuenta la complejidad y número de solicitudes, se puede prorrogar el plazo en otros dos meses más.", "Tenemos la obligación de informarle sobre los medios para ejercitar estos derechos, los cuales deben ser accesibles y sin poder denegarle el ejercicio del derecho por el solo motivo de optar por otro medio. Si la solicitud se presenta por medios electrónicos, la información se facilitará por estos medios cuando sea posible, salvo que nos solicite que sea de otro modo.", "Si GameLock no da curso a la solicitud, le informará, a más tardar en un mes, de las razones de su no actuación y la posibilidad de reclamar ante una Autoridad de Control."] },
      { type: "p", text: "A fin de facilitar su ejercicio, le facilitamos los enlaces al formulario de solicitud de cada uno de los derechos:" },
      { type: "list", items: ["Formulario de ejercicio del derecho de acceso", "Formulario de ejercicio del derecho de rectificación", "Formulario de ejercicio del derecho de oposición", "Formulario de ejercicio del derecho de supresión (derecho “al olvido”)", "Formulario de ejercicio del derecho a la limitación del tratamiento", "Formulario de ejercicio del derecho a la portabilidad", "Formulario de ejercicio a no ser objeto de decisiones individuales automatizadas"] },
      { type: "p", text: "Para ejercer sus derechos GameLock pone a su disposición los siguientes medios:" },
      { type: "list", items: ["Mediante solicitud escrita y firmada dirigida a GameLock. Ref. Ejercicio de Derechos LOPD.", "Enviando formulario escaneado y firmado a la dirección de correo electrónico gamelockweb@gmail.com indicando en el asunto Ejercicio de Derechos LOPD."] },
      { type: "p", text: "Asimismo, y especialmente si considera que no ha obtenido satisfacción plena en el ejercicio de sus derechos, le informamos que podrá presentar una reclamación ante la autoridad nacional de control dirigiéndose a estos efectos a la Agencia Española de Protección de Datos (AEPD), C/ Jorge Juan, 6 – 28001 Madrid (www.aepd.es)." },
      { type: "h4", text: "2.2.8 ¿Qué medidas de seguridad tenemos implementadas?" },
      { type: "p", text: "En GameLock nos comprometemos a proteger su información personal." },
      { type: "p", text: "Utilizamos medidas, controles y procedimientos de carácter físico, organizativo y tecnológico, razonablemente fiables y efectivos, orientados a preservar la integridad y la seguridad de sus datos y garantizar su privacidad." },
      { type: "p", text: "Además, todo el personal con acceso a los datos personales ha sido formado y tiene conocimiento de sus obligaciones con relación a los tratamientos de sus datos personales." },
      { type: "p", text: "En el caso de los contratos que suscribimos con nuestros proveedores incluimos cláusulas en las que se les exige mantener el deber de secreto respecto a los datos de carácter personal a los que hayan tenido acceso en virtud del encargo realizado, así como implantar las medidas de seguridad técnicas y organizativas necesarias para garantizar la confidencialidad, integridad, disponibilidad y resiliencia permanentes de los sistemas y servicios de tratamiento de los datos personales." },
      { type: "p", text: "Todas estas medidas de seguridad son revisadas de forma periódica para garantizar su adecuación y efectividad." },
      { type: "p", text: "Sin embargo, la seguridad absoluta no se puede garantizar y no existe ningún sistema de seguridad que sea impenetrable por lo que, en el caso de cualquier información objeto de tratamiento y bajo nuestro control se viese comprometida como consecuencia de una brecha de seguridad, tomaremos las medidas adecuadas para investigar el incidente, notificarlo a la Autoridad de Control y, en su caso, a aquellos usuarios que se hubieran podido ver afectados para que tomen las medidas adecuadas." },
      { type: "h4", text: "2.2.9 Política en redes sociales" },
      { type: "p", text: "GameLock dispone de un perfil corporativo en las redes sociales de Facebook, Instagram, X y Google." },
      { type: "p", text: "Por lo tanto, GameLock es el “Responsable del tratamiento de tus datos” en virtud de la existencia de dichos perfiles en las redes sociales y ante el hecho de que el usuario nos siga y en virtud de ello también le podamos seguir." },
      { type: "p", text: "Lo anterior significa que si el usuario decide unirse a nuestro perfil corporativo como un seguidor o dando un “Like” o un “Me gusta” a nuestros contenidos o perfil, acepta la presente política, donde explicamos sus derechos y cómo utilizamos sus datos." },
      { type: "p", text: "En calidad de responsable del tratamiento de tus datos, garantizamos la confidencialidad en el tratamiento y el cumplimiento de los derechos del usuario, siempre bajo los efectos de la normativa vigente sobre protección de datos." },
      { type: "p", text: "De otra parte, informamos que utilizaremos estas redes sociales para anunciar las noticias o información relevante relacionada con los servicios que ofrecemos, o bien sobre temas que consideremos sean de interés del usuario. Usando las funcionalidades de dichas plataformas, es posible que el usuario reciba en su muro o en su perfil noticias con este tipo de información." },
      { type: "p", text: "Ahora bien, también informamos de que no existe ningún vínculo entre GameLock y dichas plataformas o redes sociales, por lo que el usuario acepta su política de uso y condiciones una vez acceda a las mismas y/o valide sus avisos y términos y condiciones en el procedimiento de registro, no siendo responsable GameLock del uso o tratamiento de los datos del usuario que se haga fuera de la estricta relación y prestación de servicios indicados en esta política." },
    ],
  },
  {
    id: "es-propiedad",
    title: "3. PROPIEDAD INTELECTUAL E INDUSTRIAL",
    blocks: [
      { type: "p", text: "Le advertimos que GameLock es titular de todos los derechos de la propiedad intelectual e industrial de la página web, así como todos sus elementos (a título enunciativo: imágenes, sonido, audio, video, software o textos; marcas o logotipos, combinaciones de colores, estructura y diseño, selección de materiales usados, programas de ordenador necesarios para su funcionamiento, acceso y uso, etc.)." },
      { type: "p", text: "La página web de GameLock contiene textos que pretenden informar a sus usuarios. Cualquier error u omisión en el contenido generado no hará responsable en ningún caso GameLock." },
      { type: "p", text: "Las marcas, logotipos, emblemas, nombres comerciales y demás signos distintivos de Fórmula 1/F1, FIA, escuderías, pilotos y patrocinadores mencionados en esta web son propiedad exclusiva de sus respectivos titulares. Su uso en GameLock tiene únicamente fines informativos y descriptivos, para identificar a los sujetos y eventos comentados." },
      { type: "p", text: "Este sitio web no es oficial y no está asociado de ninguna manera con las empresas de Fórmula 1. F1, FORMULA ONE, FORMULA 1, FIA FORMULA ONE WORLD CHAMPIONSHIP, GRAND PRIX y las marcas relacionadas son marcas comerciales de Formula One Licensing B.V." },
      { type: "p", text: "Las imágenes y vídeos usados son propios, con licencia o proceden de fuentes que permiten su uso editorial; en caso contrario se indicará su procedencia y titularidad. No se autoriza la descarga ni reutilización de material protegido salvo lo permitido por la ley." },
      { type: "p", text: "El acceso a GameLock no implica cesión de derechos de propiedad intelectual o industrial. Si considera que algún contenido vulnera sus derechos, puede solicitar su retirada escribiendo a gamelockweb@gmail.com con prueba de titularidad y la URL del contenido." },
    ],
  },
  {
    id: "es-cookies",
    title: "4. POLÍTICA DE COOKIES",
    blocks: [
      { type: "h3", text: "4.1 Información básica sobre las cookies" },
      { type: "h4", text: "Lo que el usuario debe saber sobre las Cookies" },
      { type: "p", text: "Las cookies (galletas) son pequeños archivos que guardan información en los dispositivos de los Usuarios que usan nuestra Web." },
      { type: "p", text: "Las cookies se asocian con el navegador de un ordenador o dispositivo determinado. Gracias a ellas, resulta posible que GameLock reconozca los navegadores de los Usuarios; también sirven para determinar las preferencias del usuario de navegación y, a partir de ello, evaluar las preferencias del usuario pudiendo usarlas como indicadores, todo ello para mejorar nuestra oferta de servicios." },
      { type: "h4", text: "La aceptación de las cookies en GameLock" },
      { type: "p", text: "La Ley 34/2002, de 11 de julio, de Sociedad de la Información y Comercio Electrónico (en adelante, LSSI) en relación con las cookies exige que nuestros Usuarios sean informados con carácter previo a la experiencia de navegación en la plataforma sobre el uso, tipo y finalidad de las cookies. Esa es la razón por la que hemos implementado un aviso informativo que se despliega una vez que el usuario accede a nuestra Web, informando de manera previa, y dando la opción de que el usuario escoja las cookies que desea permitir y las acepte expresamente, cumpliendo así con los criterios establecidos por el Comité Europeo de Protección de Datos y la Guía sobre el uso de las Cookies de la AEPD." },
      { type: "h3", text: "4.2 Información detallada sobre las cookies" },
      { type: "list", items: ["Cookies técnicas o funcionales: son aquellas que permiten al usuario la navegación a través de una página web, plataforma o aplicación y la utilización de las diferentes opciones o servicios que en ella existan, incluyendo aquellas que el editor utiliza para permitir la gestión y operativa de la página web y habilitar sus funciones y servicios, como, por ejemplo, controlar el tráfico y la comunicación de datos, identificar la sesión, acceder a partes de acceso restringido, recordar los elementos que integran un pedido, realizar el proceso de compra de un pedido, gestionar el pago, controlar el fraude vinculado a la seguridad del servicio, realizar la solicitud de inscripción o participación en un evento, contar visitas a efectos de la facturación de licencias del software con el que funciona el servicio, utilizar elementos de seguridad durante la navegación, almacenar contenidos para la difusión de vídeos o sonido, habilita contenidos dinámicos o compartir contenidos a través de redes sociales.", "También pertenecen a esta categoría, por su naturaleza técnica, aquellas cookies que permiten la gestión, de la forma más eficaz posible, de los espacios publicitarios que, como un elemento más de diseño o maquetación del servicio ofrecido al usuario, el editor haya incluido en una página web, aplicación o plataforma en base a criterios como el contenido editado, sin que se recopile información de los usuarios con fines distintos, como puede ser personalizar ese contenido publicitario u otros contenidos.", "Las cookies técnicas estarán exceptuadas del cumplimiento de las obligaciones establecidas en el artículo 22.2 de la LSSI cuando permitan prestar el servicio solicitado por el usuario, como ocurre en el caso de las cookies enumeradas en los párrafos anteriores. Sin embargo, si estas cookies se utilizan también para finalidades no exentas (por ejemplo, para fines publicitarios comportamentales), quedarán sujetas a dichas obligaciones.", "Cookies de preferencias o personalización: son aquellas que permiten recordar la información para que el usuario acceda al servicio con determinadas características que pueden diferenciar su experiencia de la de otros usuarios, como, por ejemplo, el idioma, el número de resultados a mostrar cuando el usuario realiza una búsqueda, el aspecto o contenido del servicio en función del tipo de navegador a través del cual el usuario accede al servicio o de la región desde la que accede al servicio, etc.", "Si es el propio usuario quien elige esas características, las cookies estarán exceptuadas de las obligaciones del artículo 22.2 de la LSSI por considerarse un servicio expresamente solicitado por el usuario, y ello siempre y cuando las cookies obedezcan exclusivamente a la finalidad seleccionada.", "Cookies de análisis o medición: son aquellas que permiten al responsable de las mismas el seguimiento y análisis del comportamiento de los usuarios de los sitios web a los que están vinculadas, incluida la cuantificación de los impactos de los anuncios. La información recogida mediante este tipo de cookies se utiliza en la medición de la actividad de los sitios web, aplicación o plataforma, con el fin de introducir mejoras en función del análisis de los datos de uso que hacen los usuarios del servicio.", "Este tipo de cookies, a pesar de que no estén exentas del deber de obtener un consentimiento informado para su uso, el GT29 manifestó que es poco probable que representen un riesgo para la privacidad de los usuarios siempre que se trata de primera parte, que traten datos agregados con una finalidad estrictamente estadística, que se facilite la información sobre sus usos y se incluya la posibilidad de que los usuarios manifiesten su negativa sobre su utilización.", "Cookie de publicidad comportamental: son aquellas que almacenan información del comportamiento de los usuarios obtenida a través de la observación continuada de sus hábitos de navegación, lo que permite desarrollar un perfil específico para mostrar publicidad de función del mismo."] },
      { type: "h4", text: "Las cookies que utilizamos en GameLock" },
      { type: "p", text: "En la tabla que aparece a continuación se incluyen los detalles, finalidad, el tipo y las clases de cookies que hemos implementado en nuestra plataforma. Para su comprensión, detallamos a continuación los tipos de cookies que pueden ser utilizadas si el usuario nos da su consentimiento:" },
      { type: "table", head: ["Nombre", "Dominio", "Objetivo/Finalidad", "Duración", "Tipo (propias/terceros)"], rows: COOKIE_ROWS_ES },
      { type: "h3", text: "4.3 ¿Cómo desinstalar las cookies?" },
      { type: "p", text: "Si un usuario desea desinstalar las cookies utilizadas en www.gamelock.es de su navegador, a continuación, le dejamos las instrucciones para distintos navegadores:" },
      { type: "list", items: ["Para más información sobre Internet Explorer pulse aquí.", "Para más información sobre Microsoft Edge pulse aquí.", "Para más información sobre Firefox pulse aquí.", "Para más información sobre Chrome pulse aquí.", "Para más información sobre Safari pulse aquí."] },
    ],
  },
  {
    id: "es-modificaciones",
    title: "5. MODIFICACIONES EN EL TEXTO LEGAL",
    blocks: [
      { type: "p", text: "GameLock podrá modificar este texto legal de acuerdo con la legislación aplicable en cada momento. En todo caso, cualquier modificación considerable que afecte al uso de la página web del Aviso legal, la Política de Privacidad y Cookies, le será debidamente notificada al usuario para que, quede informado de los cambios realizados en el tratamiento de sus datos personales y, en caso de que la normativa aplicable así lo exija, el usuario pueda otorgar su consentimiento." },
    ],
  },
  {
    id: "es-jurisdiccion",
    title: "6. NORMATIVA Y JURISDICCIÓN",
    blocks: [
      { type: "p", text: "Nuestros textos legales se rigen por la ley española. Estos textos permanecerán accesibles para los usuarios en todo momento desde nuestra página web." },
      { type: "p", text: "Si las partes no acordasen someterse a mediación o arbitraje previamente, en el presente aviso legal se establece el acuerdo de someterse a los Juzgados y Tribunales de Santiago de Compostela renunciando expresamente a cualquier otra jurisdicción." },
      { type: "p", text: "Última modificación: 26 de junio de 2026." },
    ],
  },
  {
    id: "es-condiciones",
    title: "7. CONDICIONES DE USO",
    blocks: [
      { type: "p", text: "El presente texto establece las condiciones que regulan el acceso y uso de la página web GameLock (en adelante, “el Sitio”), cuyo titular es Hugo Espasandín García (en adelante, “GameLock”)." },
      { type: "p", text: "Lea este documento con atención. Aquí encontrará las condiciones de uso de nuestro sitio web, los derechos y obligaciones de ambas partes, entre otras cuestiones." },
      { type: "p", text: "Al acceder, navegar o utilizar el Sitio, el usuario (en adelante, “el USUARIO”) acepta plenamente estas Condiciones de Uso. Si no está de acuerdo con ellas, deberá abstenerse de usar el Sitio." },
      { type: "h3", text: "7.1 FINALIDAD DEL SITIO" },
      { type: "p", text: "GameLock es una plataforma digital dedicada a la adaptación y puesta a disposición de videojuegos clásicos con fines de entretenimiento, divulgación y acceso por parte de los usuarios, mediante su uso en línea y de forma gratuita." },
      { type: "p", text: "El Sitio no es oficial y no está afiliado, patrocinado ni respaldado por los desarrolladores, editores o titulares originales de los videojuegos, ni por las empresas propietarias de sus derechos, marcas o contenidos asociados." },
      { type: "h3", text: "7.2 ACCESO Y USO CORRECTO" },
      { type: "list", items: ["El acceso al Sitio es gratuito, salvo que se indique lo contrario para determinadas funcionalidades o servicios.", "EL USUARIO se compromete a utilizar el Sitio, sus contenidos y servicios de conformidad con la ley, la moral, el orden público y estas Condiciones.", "Queda prohibido utilizar el Sitio con fines ilícitos, lesivos de derechos de terceros o que puedan perjudicar la reputación del Sitio o de terceros.", "Queda prohibido introducir o difundir virus, malware o cualquier software dañino.", "Queda prohibido intentar acceder a áreas restringidas, cuentas de otros USUARIOS o sistemas del Sitio sin autorización."] },
      { type: "h3", text: "7.3 CONTENIDOS GENERADOS POR EL USUARIO" },
      { type: "list", items: ["El Sitio no dispone de funcionalidades que permitan a los usuarios publicar contenidos propios, tales como comentarios, entradas, mensajes o cualquier otro tipo de aportación visible para terceros.", "En caso de que el USUARIO pueda participar en determinadas funcionalidades limitadas de la plataforma (como el uso de videojuegos o interacciones técnicas básicas), éste se compromete a utilizarlas de conformidad con la ley, la buena fe, el orden público y las presentes Condiciones.", "GameLock se reserva el derecho de limitar, suspender o interrumpir el acceso de cualquier usuario que haga un uso indebido del Sitio o que incumpla lo dispuesto en estas Condiciones."] },
      { type: "h3", text: "7.4 PROPIEDAD INTELECTUAL E INDUSTRIAL" },
      { type: "list", items: ["El USUARIO reconoce y acepta que todos los contenidos, elementos y funcionalidades disponibles en el Sitio (incluidos, a título enunciativo, los videojuegos ofrecidos, su diseño, código, interfaces, gráficos, textos, sonidos, marcas, nombres comerciales, logotipos y cualquier otro elemento susceptible de protección) son titularidad de GameLock o de terceros que han autorizado su uso, y se encuentran protegidos por la normativa vigente en materia de propiedad intelectual e industrial.", "Las marcas, nombres comerciales o signos distintivos que pudieran aparecer en el Sitio y que no sean titularidad de GameLock pertenecen a sus respectivos propietarios, sin que su uso o aparición implique la existencia de derechos o responsabilidad alguna sobre los mismos.", "El acceso y uso del Sitio por parte del USUARIO no implica en ningún caso la cesión, renuncia o transmisión total o parcial de los derechos de propiedad intelectual o industrial, ni otorga ningún derecho de uso, alteración, explotación o aprovechamiento de los contenidos sin la correspondiente autorización."] },
      { type: "h3", text: "7.5 RESPONSABILIDADES" },
      { type: "list", items: ["GameLock no se responsabiliza de los daños y perjuicios que pudieran derivarse del uso indebido del Sitio por parte del USUARIO o de la utilización de sus contenidos en contra de lo dispuesto en estas Condiciones.", "GameLock no garantiza la disponibilidad continua, el acceso ininterrumpido ni la ausencia de errores en el funcionamiento del Sitio, pudiendo producirse interrupciones por causas técnicas, tareas de mantenimiento o factores ajenos a su control.", "GameLock no será responsable de los fallos, interrupciones o daños que pudieran derivarse de la prestación de servicios de acceso a Internet, virus, programas maliciosos o cualquier otra incidencia técnica que no dependa directamente de GameLock."] },
      { type: "h3", text: "7.6 OBLIGACIONES DE LOS USUARIOS" },
      { type: "p", text: "Al acceder a la página web de GameLock, el USUARIO se compromete a:" },
      { type: "list", items: ["Uso legal y conforme a las Condiciones: utilizar el Sitio de acuerdo con la ley, la buena fe, el orden público y estas Condiciones de Uso, evitando cualquier actuación que pueda dañar, inutilizar, sobrecargar o deteriorar el funcionamiento del mismo.", "Respeto hacia otros usuarios y terceros: hacer un uso correcto de los videojuegos y demás funcionalidades disponibles en la plataforma, absteniéndose de interferir en su funcionamiento, manipularlos, o utilizarlos de forma fraudulenta o contraria a su finalidad.", "Prohibición de uso indebido: no utilizar el Sitio para fines comerciales no autorizados, envío de publicidad, spam o cualquier forma de comunicación no solicitada.", "Protección de derechos de terceros: respetar los derechos de propiedad intelectual e industrial y cualesquiera otros derechos de terceros que pudieran verse afectados por su uso del Sitio.", "Veracidad de la información: facilitar información veraz, exacta y actualizada en caso de que se habiliten formularios o mecanismos de recogida de datos, evitando suplantaciones de identidad o el uso de datos de terceros sin autorización.", "Seguridad del entorno: no realizar acciones que comprometan la seguridad del Sitio, de sus sistemas o de otros usuarios, incluyendo el uso de software automatizado, bots o técnicas de extracción masiva de datos sin autorización."] },
      { type: "h3", text: "7.7 LEY APLICABLE Y JURISDICCIÓN" },
      { type: "p", text: "Para cualquier cuestión, conflicto o controversia que pueda surgir, éstas se someten expresamente a la legislación española y a la competencia de los Juzgados y Tribunales de Santiago de Compostela, renunciando expresamente a cualquier otra legislación o fuero que les sea propio, salvo que por Ley se determinen de forma imperativa otros distintos." },
      { type: "h3", text: "7.8 ACTUALIZACIONES" },
      { type: "p", text: "GameLock se reserva el derecho a modificar estas Condiciones de Uso en cualquier momento. En ese caso, se pondrá en conocimiento de los usuarios." },
      { type: "p", text: "Versión actualizada: 26 de junio de 2026." },
    ],
  },
];

const EN_SECTIONS = [
  {
    id: "en-legal-notice",
    title: "1. LEGAL NOTICE",
    blocks: [
      { type: "p", text: "In compliance with article 10.1 of Spanish Law 34/2002 of 11 July on Information Society Services and Electronic Commerce (LSSI), the identifying details of the website owner are provided below:" },
      {
        type: "list",
        items: [
          "Controller: Hugo E.G. (hereinafter, \"GameLock\")",
          "Contact email: gamelockweb@gmail.com",
          "Website identifier: www.gamelock.es",
          "PO Box: 636",
          "Postal code: 15704",
        ],
      },
    ],
  },
  {
    id: "en-privacy",
    title: "2. PRIVACY POLICY",
    blocks: [
      { type: "p", text: "Through this Privacy Policy, the user is informed in a clear, precise and concise manner. If the user accepts it, they give their free, informed, specific and unequivocal consent for GameLock to process their personal data in accordance with Regulation (EU) 2016/679 on the protection of natural persons with regard to the processing of personal data and the free movement of such data (GDPR), and Spanish Organic Law 3/2018 of 5 December on Personal Data Protection and guarantee of digital rights (LOPDGDD), meaning the European and Spanish legislation currently in force on data protection." },
      { type: "h3", text: "2.1 BASIC INFORMATION ON DATA PROTECTION" },
      {
        type: "table",
        head: ["Section", "Details"],
        rows: [
          ["Data controller", "GameLock"],
          ["Purposes of processing", "Answering queries and questions, providing the service and, where applicable, sending information about products and services."],
          ["Legal basis", "The data subject's consent and the relationship with GameLock (article 6.1(a) GDPR and article 6.1(b) GDPR)."],
          ["Recipients", "Data will not be transferred to third parties. Access may be granted to law enforcement authorities and processors required to provide the service."],
          ["Rights and additional information", "Users may exercise their rights of access, rectification or erasure, among others. All information is available in the detailed section of this Privacy Policy."],
        ],
      },
      { type: "h3", text: "2.2 DETAILED INFORMATION ON DATA PROTECTION" },
      { type: "h4", text: "2.2.1 Who is the data controller?" },
      { type: "p", text: "The identifying details of the Data Controller appear in section 1." },
      { type: "h4", text: "2.2.2 What information do we collect and process from the user through the website?" },
      { type: "p", text: "The data collected belongs to the category of identifying data, such as first name and surname, email address, and the IP address from which the user accesses the data collection form." },
      {
        type: "list",
        items: [
          "Through the Contact form. On our website, users can write to us to clarify any questions about how our products or services work or anything else they may need. To reply, we will contact the user by email or by telephone if they have provided it.",
          "Through our corporate email. Through gamelockweb@gmail.com, users may write to us and/or request the information they consider necessary to clarify questions related to our services.",
          "Through blog comments. We may also view user data through comments that users write on our blog articles. To comment, we will request a name and an email address.",
          "Through interactive mini-games. In certain mini-games, identifying data such as a name or alias and, where applicable, an email address may be requested to register participation, save scores or display results. These data may be used to create internal classifications and show rankings, provided that the user has accepted the participation conditions.",
          "Through surveys, quizzes and rankings. In surveys, questionnaires or quizzes that generate user rankings, information such as name or alias, email address if registration is required, answers provided and results obtained may be collected. These data are used exclusively for statistical purposes, creation of rankings and improvement of the user experience on the site.",
        ],
      },
      { type: "p", text: "If the user provides data relating to third parties, they assume responsibility for having previously informed those third parties and for having obtained their consent, in accordance with article 14 GDPR." },
      { type: "h4", text: "2.2.3 For what purposes do we process the user's personal data?" },
      { type: "p", text: "GameLock processes personal data for the purposes set out below, depending on the reason for which the data were provided:" },
      { type: "list", items: ["To contact, process, manage and respond to the user's request, application, incident or query, whether by email, contact form or telephone.", "To manage, where applicable, the sending of information about news related to GameLock by electronic and/or conventional means."] },
      { type: "h4", text: "2.2.4 What is the legal basis for processing the user's data?" },
      { type: "list", items: ["In order to use the services offered through the website, as well as user registration, the legal basis is the contractual relationship with GameLock and the acceptance of its terms of use. Processing is therefore based on article 6.1(b) GDPR.", "With regard to the sending of information about products, services and news related to GameLock, the legal basis for processing the personal data provided is the consent expressly granted by the user, as established in article 6.1(a) GDPR."] },
      { type: "h4", text: "2.2.5 How long will the user's personal data be processed?" },
      { type: "list", items: ["Data relating to registered users and the management of queries and requests will be kept for the time necessary to respond to them and, where applicable, while the data subject does not request withdrawal of consent to receive information related to their query.", "Data used to send information about GameLock news will be kept while the user does not revoke their consent."] },
      { type: "h4", text: "2.2.6 To which recipients will the user's personal data be disclosed?" },
      { type: "p", text: "As a general rule, data will not be transferred to third parties unless there is a legal obligation or it is necessary to provide the service. Taking this into account:" },
      { type: "list", items: ["Only where legally necessary, data will be disclosed to the Spanish law enforcement authorities.", "Data may also be disclosed to competent public authorities in the cases provided by law.", "Where applicable, data will also be disclosed to GameLock's processors for the proper provision of the service."] },
      { type: "h4", text: "2.2.7 What are the user's rights?" },
      { type: "p", text: "Data protection regulations allow users to exercise their rights of access, rectification, erasure, data portability, objection and restriction of processing, as well as the right not to be subject to decisions based solely on automated processing of their data, where applicable." },
      { type: "p", text: "These rights are characterised by the following:" },
      { type: "list", items: ["They may be exercised free of charge, unless requests are manifestly unfounded or excessive, for example because they are repetitive. In that case, GameLock may charge a fee proportional to the administrative costs incurred or refuse to act.", "Users may exercise their rights directly or through a legal or voluntary representative.", "We must respond to the request within one month, although this period may be extended by a further two months depending on the complexity and number of requests.", "We are obliged to inform users about the means for exercising these rights. These means must be accessible and we may not refuse the exercise of a right solely because the user chooses another means. If the request is submitted electronically, the information will be provided electronically where possible, unless the user requests otherwise.", "If GameLock does not act on the request, it will inform the user within one month at the latest of the reasons for not acting and of the possibility of lodging a complaint with a supervisory authority."] },
      { type: "p", text: "To facilitate the exercise of rights, we provide the links to the request form for each right:" },
      { type: "list", items: ["Form for exercising the right of access", "Form for exercising the right of rectification", "Form for exercising the right to object", "Form for exercising the right of erasure, also known as the right to be forgotten", "Form for exercising the right to restriction of processing", "Form for exercising the right to data portability", "Form for exercising the right not to be subject to automated individual decisions"] },
      { type: "p", text: "To exercise their rights, GameLock makes the following means available:" },
      { type: "list", items: ["By written and signed request addressed to GameLock. Ref. Exercise of LOPD Rights.", "By sending the scanned and signed form to gamelockweb@gmail.com, indicating Exercise of LOPD Rights in the subject line."] },
      { type: "p", text: "Likewise, and especially if users consider that they have not obtained full satisfaction in the exercise of their rights, they may lodge a complaint with the national supervisory authority, the Spanish Data Protection Agency (AEPD), C/ Jorge Juan, 6 - 28001 Madrid (www.aepd.es)." },
      { type: "h4", text: "2.2.8 What security measures have we implemented?" },
      { type: "p", text: "At GameLock we are committed to protecting personal information." },
      { type: "p", text: "We use reasonably reliable and effective physical, organisational and technological measures, controls and procedures aimed at preserving the integrity and security of data and guaranteeing privacy." },
      { type: "p", text: "In addition, all staff with access to personal data have been trained and are aware of their obligations in relation to the processing of personal data." },
      { type: "p", text: "In the contracts we sign with suppliers, we include clauses requiring them to maintain confidentiality regarding personal data to which they have had access as a result of the commissioned work, and to implement the technical and organisational security measures necessary to guarantee the ongoing confidentiality, integrity, availability and resilience of processing systems and services." },
      { type: "p", text: "All these security measures are reviewed periodically to ensure their suitability and effectiveness." },
      { type: "p", text: "However, absolute security cannot be guaranteed and no security system is impenetrable. Therefore, if any information processed and under our control is compromised as a result of a security breach, we will take the appropriate measures to investigate the incident, notify the Supervisory Authority and, where applicable, notify the users who may have been affected so that they can take appropriate measures." },
      { type: "h4", text: "2.2.9 Social media policy" },
      { type: "p", text: "GameLock has corporate profiles on Facebook, Instagram, X and Google." },
      { type: "p", text: "Therefore, GameLock is the data controller in relation to the existence of those social media profiles and when the user follows us and, by virtue of that, we may also follow the user." },
      { type: "p", text: "This means that if the user decides to join our corporate profile as a follower or by liking our content or profile, they accept this policy, in which we explain their rights and how we use their data." },
      { type: "p", text: "As controller of the user's data, we guarantee confidentiality in processing and compliance with the user's rights, always under the current data protection regulations." },
      { type: "p", text: "We also inform users that we will use these social networks to announce news or relevant information related to the services we offer, or about topics that we consider may be of interest to the user. Through the functions of these platforms, users may receive this type of information on their wall or profile." },
      { type: "p", text: "However, we also inform users that there is no link between GameLock and those platforms or social networks. Users accept the platforms' own policies of use and terms once they access them and/or validate their notices and terms during registration. GameLock is not responsible for the use or processing of user data carried out outside the strict relationship and provision of services described in this policy." },
    ],
  },
  {
    id: "en-ip",
    title: "3. INTELLECTUAL AND INDUSTRIAL PROPERTY",
    blocks: [
      { type: "p", text: "GameLock is the owner of all intellectual and industrial property rights in the website and all its elements, including, by way of example, images, sound, audio, video, software or texts, trademarks or logos, colour combinations, structure and design, selection of materials used, and computer programs necessary for its operation, access and use." },
      { type: "p", text: "The GameLock website contains texts intended to inform its users. Any error or omission in the generated content will not make GameLock liable under any circumstances." },
      { type: "p", text: "The trademarks, logos, emblems, trade names and other distinctive signs of Formula 1/F1, FIA, teams, drivers and sponsors mentioned on this website are the exclusive property of their respective owners. Their use on GameLock is solely for informational and descriptive purposes, to identify the subjects and events discussed." },
      { type: "p", text: "This website is unofficial and is not associated in any way with Formula 1 companies. F1, FORMULA ONE, FORMULA 1, FIA FORMULA ONE WORLD CHAMPIONSHIP, GRAND PRIX and related marks are trademarks of Formula One Licensing B.V." },
      { type: "p", text: "The images and videos used are owned, licensed or come from sources that allow editorial use; otherwise, their source and ownership will be indicated. Downloading or reusing protected material is not authorised except as permitted by law." },
      { type: "p", text: "Access to GameLock does not imply any assignment of intellectual or industrial property rights. If users consider that any content infringes their rights, they may request its removal by writing to gamelockweb@gmail.com with proof of ownership and the URL of the content." },
    ],
  },
  {
    id: "en-cookies",
    title: "4. COOKIE POLICY",
    blocks: [
      { type: "h3", text: "4.1 Basic information about cookies" },
      { type: "h4", text: "What users should know about cookies" },
      { type: "p", text: "Cookies are small files that store information on the devices of users who use our website." },
      { type: "p", text: "Cookies are associated with the browser of a specific computer or device. Thanks to them, GameLock can recognise users' browsers. They also help determine users' browsing preferences and evaluate those preferences as indicators, all in order to improve our service offering." },
      { type: "h4", text: "Acceptance of cookies on GameLock" },
      { type: "p", text: "Spanish Law 34/2002 of 11 July on Information Society Services and Electronic Commerce (LSSI), in relation to cookies, requires users to be informed before browsing the platform about the use, type and purpose of cookies. For this reason, we have implemented an information notice that appears when the user accesses our website, providing prior information and giving the user the option to choose which cookies they wish to allow and to expressly accept them, in accordance with the criteria established by the European Data Protection Board and the Spanish Data Protection Agency's Guide on the use of cookies." },
      { type: "h3", text: "4.2 Detailed information about cookies" },
      { type: "list", items: ["Technical or functional cookies are those that allow the user to browse a website, platform or application and use the different options or services available on it. They include cookies used by the publisher to manage and operate the website and enable its functions and services, such as controlling traffic and data communication, identifying the session, accessing restricted areas, remembering items in an order, carrying out the purchase process, managing payment, controlling fraud linked to service security, processing event registration or participation requests, counting visits for software licence billing, using security elements while browsing, storing content for video or audio distribution, enabling dynamic content or sharing content through social networks.", "This category also includes, by their technical nature, cookies that allow the most efficient possible management of advertising spaces that the publisher has included as another design or layout element of the service offered to the user, based on criteria such as edited content, without collecting user information for other purposes such as personalising that advertising content or other content.", "Technical cookies are exempt from the obligations established in article 22.2 LSSI when they allow the requested service to be provided to the user, as occurs with the cookies listed above. However, if these cookies are also used for non-exempt purposes, such as behavioural advertising, they will be subject to those obligations.", "Preference or personalisation cookies are those that remember information so that the user can access the service with certain characteristics that may differentiate their experience from that of other users, such as language, the number of results to show when the user performs a search, or the appearance or content of the service depending on the browser used or the region from which the user accesses the service.", "If the user chooses those characteristics, the cookies will be exempt from the obligations of article 22.2 LSSI because they are considered a service expressly requested by the user, provided that the cookies are used exclusively for the selected purpose.", "Analytics or measurement cookies are those that allow their controller to monitor and analyse the behaviour of users of the websites to which they are linked, including the quantification of advertising impacts. The information collected through this type of cookie is used to measure the activity of websites, applications or platforms in order to introduce improvements based on the analysis of usage data.", "Although this type of cookie is not exempt from the duty to obtain informed consent, Working Party 29 stated that it is unlikely to represent a risk to user privacy where it is first-party, processes aggregated data for strictly statistical purposes, provides information about its use and includes the possibility for users to refuse its use.", "Behavioural advertising cookies are those that store information about user behaviour obtained through continuous observation of browsing habits, allowing a specific profile to be developed in order to display advertising based on that profile."] },
      { type: "h4", text: "Cookies we use on GameLock" },
      { type: "p", text: "The table below includes the details, purpose, type and class of cookies implemented on our platform. For clarity, the following are the types of cookies that may be used if the user gives consent:" },
      { type: "table", head: ["Name", "Domain", "Purpose", "Duration", "Type (first-party/third-party)"], rows: COOKIE_ROWS_EN },
      { type: "h3", text: "4.3 How to uninstall cookies" },
      { type: "p", text: "If a user wishes to uninstall the cookies used on www.gamelock.es from their browser, below are instructions for different browsers:" },
      { type: "list", items: ["For more information about Internet Explorer click here.", "For more information about Microsoft Edge click here.", "For more information about Firefox click here.", "For more information about Chrome click here.", "For more information about Safari click here."] },
    ],
  },
  {
    id: "en-legal-text-changes",
    title: "5. CHANGES TO THE LEGAL TEXT",
    blocks: [
      { type: "p", text: "GameLock may modify this legal text in accordance with the legislation applicable at any time. In any case, any significant modification affecting the use of the website, the Legal Notice, the Privacy Policy or the Cookie Policy will be duly notified to the user so that they are informed of the changes made to the processing of their personal data and, where required by applicable regulations, may grant their consent." },
    ],
  },
  {
    id: "en-law",
    title: "6. LAW AND JURISDICTION",
    blocks: [
      { type: "p", text: "Our legal texts are governed by Spanish law. These texts will remain accessible to users at all times from our website." },
      { type: "p", text: "If the parties do not agree to submit to mediation or arbitration beforehand, this legal notice establishes the agreement to submit to the Courts and Tribunals of Santiago de Compostela, expressly waiving any other jurisdiction." },
      { type: "p", text: "Last modified: 26 June 2026." },
    ],
  },
  {
    id: "en-terms",
    title: "7. TERMS OF USE",
    blocks: [
      { type: "p", text: "This text establishes the conditions governing access to and use of the GameLock website (hereinafter, the \"Site\"), owned by Hugo Espasandin Garcia (hereinafter, \"GameLock\")." },
      { type: "p", text: "Please read this document carefully. It contains the terms of use of our website, the rights and obligations of both parties and other matters." },
      { type: "p", text: "By accessing, browsing or using the Site, the user (hereinafter, the \"USER\") fully accepts these Terms of Use. If the user does not agree with them, they must refrain from using the Site." },
      { type: "h3", text: "7.1 PURPOSE OF THE SITE" },
      { type: "p", text: "GameLock is a digital platform dedicated to adapting and making classic video games available for entertainment, dissemination and user access, through online and free use." },
      { type: "p", text: "The Site is unofficial and is not affiliated with, sponsored by or endorsed by the original developers, publishers or rights holders of the video games, nor by the companies that own their rights, trademarks or associated content." },
      { type: "h3", text: "7.2 ACCESS AND CORRECT USE" },
      { type: "list", items: ["Access to the Site is free of charge, unless otherwise indicated for certain features or services.", "The USER undertakes to use the Site, its content and services in accordance with the law, morality, public order and these Terms.", "It is prohibited to use the Site for unlawful purposes, purposes that harm third-party rights or purposes that may damage the reputation of the Site or third parties.", "It is prohibited to introduce or disseminate viruses, malware or any harmful software.", "It is prohibited to attempt to access restricted areas, other USER accounts or Site systems without authorisation."] },
      { type: "h3", text: "7.3 USER-GENERATED CONTENT" },
      { type: "list", items: ["The Site does not include functionalities that allow users to publish their own content, such as comments, posts, messages or any other contribution visible to third parties.", "If the USER can participate in certain limited platform functionalities, such as the use of video games or basic technical interactions, the USER undertakes to use them in accordance with the law, good faith, public order and these Terms.", "GameLock reserves the right to limit, suspend or interrupt access by any user who misuses the Site or breaches these Terms."] },
      { type: "h3", text: "7.4 INTELLECTUAL AND INDUSTRIAL PROPERTY" },
      { type: "list", items: ["The USER acknowledges and accepts that all content, elements and functionalities available on the Site, including, by way of example, the video games offered, their design, code, interfaces, graphics, texts, sounds, trademarks, trade names, logos and any other protectable element, are owned by GameLock or by third parties that have authorised their use and are protected by current intellectual and industrial property regulations.", "The trademarks, trade names or distinctive signs that may appear on the Site and are not owned by GameLock belong to their respective owners, and their use or appearance does not imply the existence of any rights or responsibility over them.", "Access to and use of the Site by the USER does not imply any assignment, waiver or total or partial transfer of intellectual or industrial property rights, nor does it grant any right to use, alter, exploit or benefit from the content without the corresponding authorisation."] },
      { type: "h3", text: "7.5 LIABILITY" },
      { type: "list", items: ["GameLock is not responsible for damages that may arise from misuse of the Site by the USER or from use of its content contrary to these Terms.", "GameLock does not guarantee continuous availability, uninterrupted access or the absence of errors in the operation of the Site. Interruptions may occur due to technical causes, maintenance tasks or factors beyond its control.", "GameLock will not be responsible for failures, interruptions or damage arising from Internet access services, viruses, malicious programs or any other technical incident that does not depend directly on GameLock."] },
      { type: "h3", text: "7.6 USER OBLIGATIONS" },
      { type: "p", text: "By accessing the GameLock website, the USER undertakes to:" },
      { type: "list", items: ["Legal use in accordance with the Terms: use the Site in accordance with the law, good faith, public order and these Terms of Use, avoiding any action that could damage, disable, overload or impair its operation.", "Respect for other users and third parties: make proper use of the video games and other functionalities available on the platform, refraining from interfering with their operation, manipulating them or using them fraudulently or contrary to their purpose.", "Prohibition of misuse: not use the Site for unauthorised commercial purposes, advertising, spam or any form of unsolicited communication.", "Protection of third-party rights: respect intellectual and industrial property rights and any other third-party rights that may be affected by use of the Site.", "Truthfulness of information: provide truthful, accurate and updated information if forms or data collection mechanisms are enabled, avoiding impersonation or the use of third-party data without authorisation.", "Security of the environment: not carry out actions that compromise the security of the Site, its systems or other users, including the use of automated software, bots or massive data extraction techniques without authorisation."] },
      { type: "h3", text: "7.7 APPLICABLE LAW AND JURISDICTION" },
      { type: "p", text: "Any matter, conflict or dispute that may arise is expressly subject to Spanish law and to the jurisdiction of the Courts and Tribunals of Santiago de Compostela, with express waiver of any other legislation or forum that may correspond to the parties, unless the law imperatively determines otherwise." },
      { type: "h3", text: "7.8 UPDATES" },
      { type: "p", text: "GameLock reserves the right to modify these Terms of Use at any time. In that case, users will be informed." },
      { type: "p", text: "Updated version: 26 June 2026." },
    ],
  },
];

const UI_COPY = {
  es: {
    eyebrow: "GameLock",
    title: "Politicas legales",
    intro: "Consulta aqui el aviso legal, la politica de privacidad, la politica de cookies y las condiciones de uso de GameLock.",
    updated: "Ultima modificacion: 26 de junio de 2026.",
    close: "Cerrar politicas legales",
  },
  en: {
    eyebrow: "GameLock",
    title: "Legal policies",
    intro: "Review GameLock's legal notice, privacy policy, cookie policy and terms of use.",
    updated: "Last modified: 26 June 2026.",
    close: "Close legal policies",
  },
};

const LEGAL_DOCUMENTS = [
  { id: "es", label: "Espanol", sections: ES_SECTIONS },
  { id: "en", label: "English", sections: EN_SECTIONS },
];

function LegalBlock({ block }) {
  if (block.type === "h3") {
    return <h3 className="legal-policies-subtitle">{block.text}</h3>;
  }

  if (block.type === "h4") {
    return <h4 className="legal-policies-subheading">{block.text}</h4>;
  }

  if (block.type === "list") {
    return (
      <ul>
        {block.items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    );
  }

  if (block.type === "table") {
    return (
      <div className="legal-policies-table-wrap">
        <table className="legal-policies-table">
          <thead>
            <tr>
              {block.head.map((cell) => (
                <th key={cell}>{cell}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.rows.map((row) => (
              <tr key={row.join("|")}>
                {row.map((cell, index) => (
                  <td key={`${cell}-${index}`}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return <p>{block.text}</p>;
}

function LegalPoliciesModal({ isOpen, onClose, focusSection = null }) {
  const legalLocale = useMemo(() => resolveBrowserLanguage(), []);
  const copy = UI_COPY[legalLocale] || UI_COPY.es;
  const activeLegalDocuments = useMemo(
    () => LEGAL_DOCUMENTS.filter((document) => document.id === legalLocale),
    [legalLocale]
  );
  const defaultOpenSectionId = activeLegalDocuments[0]?.sections[0]?.id ?? "";
  const focusSectionId = focusSection
    ? (FOCUS_SECTION_IDS[legalLocale] || FOCUS_SECTION_IDS.es)[focusSection] ?? ""
    : "";
  const initialOpenSectionId = focusSectionId || defaultOpenSectionId;
  const [openSectionIds, setOpenSectionIds] = useState(() => new Set(initialOpenSectionId ? [initialOpenSectionId] : []));
  const focusSectionRef = useRef(null);

  useEffect(() => {
    setOpenSectionIds(new Set(initialOpenSectionId ? [initialOpenSectionId] : []));
  }, [initialOpenSectionId, isOpen]);

  useEffect(() => {
    if (!isOpen || !focusSectionId) return undefined;
    const frame = requestAnimationFrame(() => {
      focusSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    return () => cancelAnimationFrame(frame);
  }, [isOpen, focusSectionId]);

  const toggleSection = (sectionId) => {
    setOpenSectionIds((current) => {
      const next = new Set(current);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="legal-policies-layer" role="presentation" onMouseDown={onClose}>
      <article
        aria-modal="true"
        className="legal-policies-modal"
        role="dialog"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="legal-policies-header">
          <div>
            <p className="legal-policies-eyebrow">{copy.eyebrow}</p>
            <h2>{copy.title}</h2>
          </div>
          <button className="legal-policies-close" type="button" onClick={onClose} aria-label={copy.close}>
            ×
          </button>
        </header>

        <p className="legal-policies-intro">{copy.intro}</p>
        <p className="legal-policies-updated">{copy.updated}</p>

        <div className="legal-policies-documents">
          {activeLegalDocuments.map((document) => (
            <section className="legal-policies-language" key={document.id} aria-labelledby={`legal-${document.id}`}>
              <h2 className="legal-policies-language-title" id={`legal-${document.id}`}>
                {document.label}
              </h2>
              <div className="legal-policies-sections legal-policies-sections--full">
                {document.sections.map((section) => {
                  const sectionOpen = openSectionIds.has(section.id);
                  const contentId = `legal-section-${section.id}`;

                  return (
                    <section
                      className={[
                        "legal-policies-section",
                        "legal-policies-section--full",
                        sectionOpen ? "is-open" : "",
                      ].join(" ")}
                      key={section.id}
                      ref={section.id === focusSectionId ? focusSectionRef : undefined}
                    >
                      <button
                        type="button"
                        className="legal-policies-section-toggle"
                        aria-expanded={sectionOpen}
                        aria-controls={contentId}
                        onClick={() => toggleSection(section.id)}
                      >
                        <span>{section.title}</span>
                        <span className="legal-policies-section-icon" aria-hidden="true">
                          {sectionOpen ? "−" : "+"}
                        </span>
                      </button>
                      {sectionOpen && (
                        <div className="legal-policies-section-content" id={contentId}>
                          {section.blocks.map((block, index) => (
                            <LegalBlock block={block} key={`${section.id}-${index}`} />
                          ))}
                        </div>
                      )}
                    </section>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </article>
    </div>
  );
}

export default LegalPoliciesModal;
