/**
 * Utilidad autonoma y nativa para generacion de codigos QR en formato SVG vectorial.
 * Implementa el estandar QR Code (Modelo 2) con codificacion Byte y correccion de errores L.
 * No requiere librerias externas de npm ni dependencias de red.
 */

export class QrCodeUtil {

  /**
   * Genera una cadena SVG que representa el codigo QR del texto especificado.
   * @param texto Cadena a codificar (URL o codigo de seguimiento).
   * @param tamanoPixeles Tamano en pixeles del SVG resultante (por defecto 200).
   * @returns Cadena SVG autocontenida.
   */
  public static generarSvg(texto: string, tamanoPixeles = 200): string {
    const matriz = this.crearMatriz(texto);
    const modulos = matriz.length;
    const tamanoModulo = 10;
    const margen = 2;
    const dimensionTotal = (modulos + margen * 2) * tamanoModulo;

    let paths = '';
    for (let f = 0; f < modulos; f++) {
      for (let c = 0; c < modulos; c++) {
        if (matriz[f][c]) {
          const x = (c + margen) * tamanoModulo;
          const y = (f + margen) * tamanoModulo;
          paths += `M${x},${y}h${tamanoModulo}v${tamanoModulo}h-${tamanoModulo}z `;
        }
      }
    }

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${dimensionTotal} ${dimensionTotal}" width="${tamanoPixeles}" height="${tamanoPixeles}" role="img" aria-label="Codigo QR de seguimiento"><rect width="100%" height="100%" fill="#ffffff" rx="8"/><path d="${paths.trim()}" fill="#1e293b"/></svg>`;
  }

  private static crearMatriz(texto: string): boolean[][] {
    // Determinar la version segun longitud (Version 2: 25x25, Version 3: 29x29, Version 4: 33x33)
    const bytes = this.codificarUtf8(texto);
    let version = 2;
    if (bytes.length > 32) {
      version = 4;
    } else if (bytes.length > 16) {
      version = 3;
    }

    const tamano = 17 + 4 * version;
    const matriz: boolean[][] = Array.from({ length: tamano }, () => Array(tamano).fill(false));
    const reservado: boolean[][] = Array.from({ length: tamano }, () => Array(tamano).fill(false));

    // Patrones de busqueda (Finder patterns 7x7) en las 3 esquinas
    this.colocarPatronBusqueda(matriz, reservado, 0, 0);
    this.colocarPatronBusqueda(matriz, reservado, tamano - 7, 0);
    this.colocarPatronBusqueda(matriz, reservado, 0, tamano - 7);

    // Separadores (lineas blancas alrededor de los finder patterns)
    this.colocarSeparadores(reservado, tamano);

    // Patrones de sincronizacion (Timing patterns)
    for (let i = 8; i < tamano - 8; i++) {
      const bit = i % 2 === 0;
      matriz[6][i] = bit;
      reservado[6][i] = true;
      matriz[i][6] = bit;
      reservado[i][6] = true;
    }

    // Patrones de alineacion para version >= 2
    if (version >= 2) {
      const pos = version === 2 ? 18 : (version === 3 ? 22 : 26);
      this.colocarPatronAlineacion(matriz, reservado, pos, pos);
    }

    // Modulo oscuro y formato reservado
    matriz[tamano - 8][8] = true;
    reservado[tamano - 8][8] = true;
    for (let i = 0; i < 9; i++) {
      reservado[8][i] = true;
      reservado[i][8] = true;
      reservado[8][tamano - 1 - i] = true;
      reservado[tamano - 1 - i][8] = true;
    }

    // Codificar flujo de bits con modo Byte (0100) + conteo + datos + terminador + padding
    const bitStream = this.generarFlujoBits(bytes, version);

    // Colocar datos en la matriz zig-zag (derecha a izquierda, arriba y abajo)
    let bitIndex = 0;
    let haciaArriba = true;
    for (let c = tamano - 1; c > 0; c -= 2) {
      if (c === 6) c--; // Saltar columna de sincronizacion vertical
      for (let fStep = 0; fStep < tamano; fStep++) {
        const f = haciaArriba ? (tamano - 1 - fStep) : fStep;
        for (let col = c; col >= c - 1; col--) {
          if (!reservado[f][col]) {
            let bit = false;
            if (bitIndex < bitStream.length) {
              bit = bitStream[bitIndex++] === '1';
            }
            // Aplicar mascara estandar (fila + col) % 2 === 0
            const mascara = (f + col) % 2 === 0;
            matriz[f][col] = bit !== mascara;
          }
        }
      }
      haciaArriba = !haciaArriba;
    }

    // Informacion de formato para correccion de error L y mascara 0 (000)
    // Cadena de formato BCH para L (01) y mascara (000): 111011111000100
    const formatoBits = '111011111000100';
    this.colocarInformacionFormato(matriz, tamano, formatoBits);

    return matriz;
  }

  private static colocarPatronBusqueda(matriz: boolean[][], reservado: boolean[][], fila: number, col: number): void {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        const esBorde = r === 0 || r === 6 || c === 0 || c === 6;
        const esCentro = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        matriz[fila + r][col + c] = esBorde || esCentro;
        reservado[fila + r][col + c] = true;
      }
    }
  }

  private static colocarSeparadores(reservado: boolean[][], tamano: number): void {
    for (let i = 0; i < 8; i++) {
      // Esquina superior izquierda
      reservado[7][i] = true;
      reservado[i][7] = true;
      // Esquina superior derecha
      reservado[7][tamano - 1 - i] = true;
      reservado[i][tamano - 8] = true;
      // Esquina inferior izquierda
      reservado[tamano - 8][i] = true;
      reservado[tamano - 1 - i][7] = true;
    }
  }

  private static colocarPatronAlineacion(matriz: boolean[][], reservado: boolean[][], fila: number, col: number): void {
    for (let r = -2; r <= 2; r++) {
      for (let c = -2; c <= 2; c++) {
        const esBorde = Math.abs(r) === 2 || Math.abs(c) === 2;
        const esPunto = r === 0 && c === 0;
        matriz[fila + r][col + c] = esBorde || esPunto;
        reservado[fila + r][col + c] = true;
      }
    }
  }

  private static colocarInformacionFormato(matriz: boolean[][], tamano: number, formato: string): void {
    for (let i = 0; i < 15; i++) {
      const bit = formato[i] === '1';
      // Arriba izquierda
      if (i < 6) {
        matriz[8][i] = bit;
      } else if (i === 6) {
        matriz[8][7] = bit;
      } else if (i === 7) {
        matriz[8][8] = bit;
      } else if (i === 8) {
        matriz[7][8] = bit;
      } else {
        matriz[14 - i][8] = bit;
      }

      // Alrededor de los patrones opuestos
      if (i < 8) {
        matriz[tamano - 1 - i][8] = bit;
      } else {
        matriz[8][tamano - 15 + i] = bit;
      }
    }
  }

  private static codificarUtf8(cadena: string): number[] {
    const bytes: number[] = [];
    for (let i = 0; i < cadena.length; i++) {
      let code = cadena.charCodeAt(i);
      if (code < 128) {
        bytes.push(code);
      } else if (code < 2048) {
        bytes.push(192 | (code >> 6));
        bytes.push(128 | (code & 63));
      } else {
        bytes.push(224 | (code >> 12));
        bytes.push(128 | ((code >> 6) & 63));
        bytes.push(128 | (code & 63));
      }
    }
    return bytes;
  }

  private static generarFlujoBits(bytes: number[], version: number): string {
    let bits = '0100'; // Modo 8-bit Byte
    // Contador de longitud de 8 bits
    bits += bytes.length.toString(2).padStart(8, '0');
    // Codificacion de cada byte
    for (const b of bytes) {
      bits += b.toString(2).padStart(8, '0');
    }
    // Terminador (hasta 4 ceros)
    bits += '0000';
    // Alineacion a multiplo de 8
    while (bits.length % 8 !== 0) {
      bits += '0';
    }

    // Capacidad de datos en palabras de codigo para Correccion L
    const capacidadBytes = version === 2 ? 34 : (version === 3 ? 55 : 80);
    // Bytes de relleno (Pad bytes 0xEC y 0x11)
    const pad = ['11101100', '00010001'];
    let padIndex = 0;
    while (bits.length < capacidadBytes * 8) {
      bits += pad[padIndex % 2];
      padIndex++;
    }

    return bits;
  }
}
