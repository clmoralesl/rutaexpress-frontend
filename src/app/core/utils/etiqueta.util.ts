/**
 * Utilidades matematicas y graficas para generacion vectorial de
 * codigos de barras y codigos QR para rotulado logistico termico (10x15 cm).
 */

// ============================================================================
// GENERADOR DE CODIGO DE BARRAS (CODE 128 B)
// ============================================================================

/**
 * Patrones de barras de Code 128 para caracteres del 0 al 107.
 * Cada digito representa el ancho de una barra o espacio alternados (1 a 4 modulos).
 */
const PATRONES_CODE128: readonly string[] = [
  '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213', // 0-9
  '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132', // 10-19
  '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211', // 20-29
  '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313', // 30-39
  '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331', // 40-49
  '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111', // 50-59
  '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214', // 60-69
  '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111', // 70-79
  '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141', // 80-89
  '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141', // 90-99
  '114131', '311141', '411131', '211412', '211214', '211232', '2331112' // 100-106 (106 es STOP de 7 elementos)
];

const START_CODE_B = 104;
const STOP_CODE = 106;

/**
 * Codifica una cadena de texto en codigo de barras Code 128 B y retorna el SVG correspondiente.
 */
export function generarCodigoBarrasSvg(
  texto: string,
  ancho: number = 320,
  alto: number = 60,
  mostrarTexto: boolean = true
): string {
  const limpio = (texto || 'RTX-000000').toUpperCase().trim();
  const codigos: number[] = [START_CODE_B];

  for (let i = 0; i < limpio.length; i++) {
    const code = limpio.charCodeAt(i) - 32;
    if (code >= 0 && code <= 95) {
      codigos.push(code);
    } else {
      codigos.push(0); // Espacio de respaldo
    }
  }

  // Calculo de Checksum Code 128
  let suma = codigos[0];
  for (let i = 1; i < codigos.length; i++) {
    suma += codigos[i] * i;
  }
  const checksum = suma % 103;
  codigos.push(checksum);
  codigos.push(STOP_CODE);

  // Convertir los patrones en modulos binarios (1 = barra, 0 = espacio)
  let modulos = '0000000000'; // Zona muda inicial (quiet zone)
  for (let c = 0; c < codigos.length; c++) {
    const patron = PATRONES_CODE128[codigos[c]];
    if (!patron) continue;
    let esBarra = true;
    for (let p = 0; p < patron.length; p++) {
      const cantidad = parseInt(patron[p], 10);
      modulos += (esBarra ? '1' : '0').repeat(cantidad);
      esBarra = !esBarra;
    }
  }
  modulos += '0000000000'; // Zona muda final

  const totalModulos = modulos.length;
  const altoBarras = mostrarTexto ? alto - 16 : alto;
  const rectangulos: string[] = [];

  for (let i = 0; i < totalModulos; i++) {
    if (modulos[i] === '1') {
      let runLength = 1;
      while (i + 1 < totalModulos && modulos[i + 1] === '1') {
        runLength++;
        i++;
      }
      rectangulos.push(
        `<rect x="${(i - runLength + 1)}" y="0" width="${runLength}" height="${altoBarras}" fill="#111827" />`
      );
    }
  }

  const textoSvg = mostrarTexto
    ? `<text x="${totalModulos / 2}" y="${alto - 2}" text-anchor="middle" font-family="'Courier New', monospace" font-size="12" font-weight="bold" fill="#111827" letter-spacing="3">${limpio}</text>`
    : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalModulos} ${alto}" width="${ancho}" height="${alto}" style="display:block;margin:0 auto;background:#ffffff;">
    <rect width="${totalModulos}" height="${alto}" fill="#ffffff" />
    ${rectangulos.join('')}
    ${textoSvg}
  </svg>`;
}

// ============================================================================
// GENERADOR DE CODIGO QR VECTORIAL AUTONOMO (VERSIONES 1 A 6)
// ============================================================================

// Tabla log / exp para Galois Field GF(256) con polinomio 0x11d (285)
const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);

(() => {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = x;
    GF_LOG[x] = i;
    x = x << 1;
    if (x & 256) {
      x ^= 285;
    }
  }
  for (let i = 255; i < 512; i++) {
    GF_EXP[i] = GF_EXP[i - 255];
  }
})();

function gfMultiplicar(x: number, y: number): number {
  if (x === 0 || y === 0) return 0;
  return GF_EXP[GF_LOG[x] + GF_LOG[y]];
}

function generarPolinomioGenerador(grado: number): Uint8Array {
  let g = new Uint8Array([1]);
  for (let i = 0; i < grado; i++) {
    const factor = new Uint8Array([1, GF_EXP[i]]);
    const resultado = new Uint8Array(g.length + 1);
    for (let j = 0; j < g.length; j++) {
      for (let k = 0; k < factor.length; k++) {
        resultado[j + k] ^= gfMultiplicar(g[j], factor[k]);
      }
    }
    g = resultado;
  }
  return g;
}

function calcularCodigosReedSolomon(datos: Uint8Array, palabrasEc: number): Uint8Array {
  const generador = generarPolinomioGenerador(palabrasEc);
  const residuo = new Uint8Array(datos.length + palabrasEc);
  residuo.set(datos);

  for (let i = 0; i < datos.length; i++) {
    const factor = residuo[i];
    if (factor !== 0) {
      for (let j = 0; j < generador.length; j++) {
        residuo[i + j] ^= gfMultiplicar(generador[j], factor);
      }
    }
  }

  return residuo.slice(datos.length);
}

interface InformacionVersionQr {
  version: number;
  tamano: number;
  capacidadBytes: number;
  totalPalabrasCodigo: number;
  palabrasEc: number;
  patronesAlineacion: number[];
}

/**
 * Tabla de especificaciones para QR Nivel M (aprox 15% correccion de error).
 */
const TABLA_VERSIONES_M: InformacionVersionQr[] = [
  { version: 1, tamano: 21, capacidadBytes: 14, totalPalabrasCodigo: 26, palabrasEc: 10, patronesAlineacion: [] },
  { version: 2, tamano: 25, capacidadBytes: 26, totalPalabrasCodigo: 44, palabrasEc: 16, patronesAlineacion: [6, 18] },
  { version: 3, tamano: 29, capacidadBytes: 42, totalPalabrasCodigo: 70, palabrasEc: 26, patronesAlineacion: [6, 22] },
  { version: 4, tamano: 33, capacidadBytes: 62, totalPalabrasCodigo: 100, palabrasEc: 36, patronesAlineacion: [6, 26] },
  { version: 5, tamano: 37, capacidadBytes: 84, totalPalabrasCodigo: 134, palabrasEc: 48, patronesAlineacion: [6, 30] },
  { version: 6, tamano: 41, capacidadBytes: 106, totalPalabrasCodigo: 172, palabrasEc: 64, patronesAlineacion: [6, 34] }
];

/**
 * Genera el SVG completo de un codigo QR a partir de cualquier cadena o URL.
 */
export function generarQrSvg(
  contenido: string,
  tamanoPx: number = 180,
  colorModulo: string = '#111827'
): string {
  const encoder = new TextEncoder();
  const bytesTexto = encoder.encode(contenido || 'https://rutaexpress.cl');

  // Elegir version minima con capacidad suficiente
  let versionElegida: InformacionVersionQr = TABLA_VERSIONES_M[0];
  let encontrada = false;

  for (const v of TABLA_VERSIONES_M) {
    if (bytesTexto.length <= v.capacidadBytes) {
      versionElegida = v;
      encontrada = true;
      break;
    }
  }

  if (!encontrada) {
    versionElegida = TABLA_VERSIONES_M[TABLA_VERSIONES_M.length - 1];
  }

  const { tamano, capacidadBytes, palabrasEc } = versionElegida;

  // Empaquetar bits en modo Byte (Modo 0100 + indicador de conteo de 8 bits para V1-9)
  const bitstream: number[] = [];
  function agregarBits(valor: number, bits: number): void {
    for (let i = bits - 1; i >= 0; i--) {
      bitstream.push((valor >> i) & 1);
    }
  }

  // Indicador de modo Byte = 4 (0100)
  agregarBits(4, 4);
  // Conteo de caracteres (8 bits para V1-9)
  const longitudDatos = Math.min(bytesTexto.length, capacidadBytes);
  agregarBits(longitudDatos, 8);

  for (let i = 0; i < longitudDatos; i++) {
    agregarBits(bytesTexto[i], 8);
  }

  // Terminador de 4 ceros si queda espacio
  const capacidadBitsDatos = capacidadBytes * 8;
  const cerosFaltantes = Math.min(4, capacidadBitsDatos - bitstream.length);
  for (let i = 0; i < cerosFaltantes; i++) {
    bitstream.push(0);
  }

  // Rellenar hasta multiplo de 8
  while (bitstream.length % 8 !== 0 && bitstream.length < capacidadBitsDatos) {
    bitstream.push(0);
  }

  // Convertir bits en palabras de codigo
  const bytesDatos = new Uint8Array(capacidadBytes);
  let indiceByte = 0;
  for (let i = 0; i < bitstream.length; i += 8) {
    let b = 0;
    for (let j = 0; j < 8; j++) {
      b = (b << 1) | (bitstream[i + j] || 0);
    }
    bytesDatos[indiceByte++] = b;
  }

  // Bytes de relleno alternados 0xEC y 0x11
  let pad = 0xec;
  while (indiceByte < capacidadBytes) {
    bytesDatos[indiceByte++] = pad;
    pad = pad === 0xec ? 0x11 : 0xec;
  }

  // Generar palabras de correccion de error
  const bytesEc = calcularCodigosReedSolomon(bytesDatos, palabrasEc);

  // Unir secuencia completa de palabras de codigo
  const secuenciaCompleta = new Uint8Array(capacidadBytes + palabrasEc);
  secuenciaCompleta.set(bytesDatos, 0);
  secuenciaCompleta.set(bytesEc, capacidadBytes);

  // Inicializar matriz QR
  const matriz: (boolean | null)[][] = Array.from({ length: tamano }, () =>
    Array.from({ length: tamano }, () => null)
  );
  const esFuncion: boolean[][] = Array.from({ length: tamano }, () =>
    Array.from({ length: tamano }, () => false)
  );

  // Marcar patron buscador 7x7
  function aplicarPatronBuscador(origenX: number, origenY: number): void {
    for (let dy = -1; dy <= 7; dy++) {
      for (let dx = -1; dx <= 7; dx++) {
        const x = origenX + dx;
        const y = origenY + dy;
        if (x >= 0 && x < tamano && y >= 0 && y < tamano) {
          esFuncion[y][x] = true;
          if (dx >= 0 && dx <= 6 && dy >= 0 && dy <= 6) {
            matriz[y][x] =
              dx === 0 || dx === 6 || dy === 0 || dy === 6 || (dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4);
          } else {
            matriz[y][x] = false; // Separador blanco
          }
        }
      }
    }
  }

  aplicarPatronBuscador(0, 0);
  aplicarPatronBuscador(tamano - 7, 0);
  aplicarPatronBuscador(0, tamano - 7);

  // Patrones de alineacion si version >= 2
  if (versionElegida.patronesAlineacion.length >= 2) {
    const coords = versionElegida.patronesAlineacion;
    for (const py of coords) {
      for (const px of coords) {
        if (esFuncion[py][px]) continue;
        for (let dy = -2; dy <= 2; dy++) {
          for (let dx = -2; dx <= 2; dx++) {
            const x = px + dx;
            const y = py + dy;
            esFuncion[y][x] = true;
            matriz[y][x] =
              Math.abs(dx) === 2 || Math.abs(dy) === 2 || (dx === 0 && dy === 0);
          }
        }
      }
    }
  }

  // Patrones de temporizacion en fila 6 y columna 6
  for (let i = 0; i < tamano; i++) {
    if (!esFuncion[6][i]) {
      esFuncion[6][i] = true;
      matriz[6][i] = i % 2 === 0;
    }
    if (!esFuncion[i][6]) {
      esFuncion[i][6] = true;
      matriz[i][6] = i % 2 === 0;
    }
  }

  // Modulo oscuro solitario obligatorio
  esFuncion[tamano - 8][8] = true;
  matriz[tamano - 8][8] = true;

  // Reservar informacion de formato alrededor de los buscadores
  for (let i = 0; i < 9; i++) {
    if (!esFuncion[8][i]) {
      esFuncion[8][i] = true;
    }
    if (!esFuncion[i][8]) {
      esFuncion[i][8] = true;
    }
  }
  for (let i = tamano - 8; i < tamano; i++) {
    if (!esFuncion[8][i]) {
      esFuncion[8][i] = true;
    }
  }
  for (let i = tamano - 8; i < tamano; i++) {
    if (!esFuncion[i][8]) {
      esFuncion[i][8] = true;
    }
  }

  // Convertir secuencia completa de bytes a flujo continuo de bits
  const bitsFinales: number[] = [];
  for (let i = 0; i < secuenciaCompleta.length; i++) {
    for (let b = 7; b >= 0; b--) {
      bitsFinales.push((secuenciaCompleta[i] >> b) & 1);
    }
  }

  // Rellenar datos en zigzag de derecha a izquierda
  let bitIndex = 0;
  let subiendo = true;
  for (let col = tamano - 1; col > 0; col -= 2) {
    if (col === 6) col--; // Saltar linea de temporizacion vertical
    for (let count = 0; count < tamano; count++) {
      const fila = subiendo ? tamano - 1 - count : count;
      for (let c = 0; c < 2; c++) {
        const x = col - c;
        const y = fila;
        if (!esFuncion[y][x]) {
          const bit = bitIndex < bitsFinales.length ? bitsFinales[bitIndex++] : 0;
          // Aplicar mascara estandar (mascara 0: (fila + col) % 2 === 0)
          const enmascarar = (y + x) % 2 === 0;
          matriz[y][x] = enmascarar ? bit === 0 : bit === 1;
        }
      }
    }
    subiendo = !subiendo;
  }

  // Informacion de Formato para Nivel M con mascara 0 (cadena estandar BCH 15 bits: 101010000010010)
  const formatoBits = [1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0];

  // Aplicar bits de formato al buscador superior izquierdo
  for (let i = 0; i <= 5; i++) {
    matriz[8][i] = formatoBits[i] === 1;
  }
  matriz[8][7] = formatoBits[6] === 1;
  matriz[8][8] = formatoBits[7] === 1;
  matriz[7][8] = formatoBits[8] === 1;
  for (let i = 9; i <= 14; i++) {
    matriz[14 - i][8] = formatoBits[i] === 1;
  }

  // Aplicar bits de formato al buscador superior derecho e inferior izquierdo
  for (let i = 0; i < 8; i++) {
    matriz[8][tamano - 1 - i] = formatoBits[i] === 1;
  }
  for (let i = 8; i < 15; i++) {
    matriz[tamano - 15 + i][8] = formatoBits[i] === 1;
  }

  // Construccion del SVG vectorial
  const margen = 2;
  const tamanoTotal = tamano + margen * 2;
  const paths: string[] = [];

  for (let y = 0; y < tamano; y++) {
    for (let x = 0; x < tamano; x++) {
      if (matriz[y][x] === true) {
        paths.push(`M${x + margen},${y + margen}h1v1h-1z`);
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${tamanoTotal} ${tamanoTotal}" width="${tamanoPx}" height="${tamanoPx}" shape-rendering="crispEdges">
    <rect width="${tamanoTotal}" height="${tamanoTotal}" fill="#ffffff" />
    <path d="${paths.join('')}" fill="${colorModulo}" />
  </svg>`;
}
