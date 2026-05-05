import { Workbook } from "exceljs";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

import { formatUsd } from "@/lib/format-currency";

import {
  formatDdMmYyyy,
  formatGeneratedAt,
  formatPeriodoLine,
  formatReservationDateForExport,
  formatReservationTimeForExport,
  granularidadLabel,
} from "./export-formatting";
import { fetchReports } from "./api";
import type { ReportQueryParams } from "./api";
import { PDF_CHART_DIM, renderReportChartToDataUrl } from "./report-pdf-chart";
import type {
  GraficoIngresosTiempo,
  GraficoIngresosTour,
  GraficoReservasEmpleado,
  GraficoReservasEstado,
  GraficoReservasTiempo,
  ReportReservationRow,
  ReportsData,
  TipoReporte,
} from "./types";

const TIPO_LABEL: Record<TipoReporte, string> = {
  reservas_tiempo: "Reservas en el tiempo",
  reservas_estado: "Reservas por estado",
  reservas_empleado: "Reservas por empleado",
  ingresos_tiempo: "Ingresos en el tiempo",
  ingresos_tour: "Ingresos por tour",
};

const TIPO_FILENAME: Record<TipoReporte, string> = {
  reservas_tiempo: "Reservas_en_el_Tiempo",
  reservas_estado: "Reservas_por_Estado",
  reservas_empleado: "Reservas_por_Empleado",
  ingresos_tiempo: "Ingresos_en_el_Tiempo",
  ingresos_tour: "Ingresos_por_Tour",
};

function estadoEtiqueta(estado: string): string {
  const map: Record<string, string> = {
    pending: "Pendiente",
    in_progress: "En curso",
    completed: "Completada",
    cancelled: "Cancelada",
  };
  return map[estado] ?? estado;
}

function safeFilenamePart(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9_\-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function num(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v.replace(",", "."));
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function chartSectionCsv(
  tipo: TipoReporte,
  datos: unknown,
): { title: string; rows: (string | number)[][] } {
  if (tipo === "reservas_tiempo" && isTiempoCantidad(datos)) {
    return {
      title: "Serie - Reservas por periodo",
      rows: [["Periodo", "Cantidad"], ...datos.map((x) => [x.periodo, x.cantidad])],
    };
  }
  if (tipo === "ingresos_tiempo" && isTiempoIngresos(datos)) {
    return {
      title: "Serie - Ingresos por periodo",
      rows: [["Periodo", "Ingresos USD"], ...datos.map((x) => [x.periodo, x.ingresos])],
    };
  }
  if (tipo === "reservas_estado" && isPorEstado(datos)) {
    return {
      title: "Serie - Reservas por estado",
      rows: [["Estado", "Cantidad"], ...datos.map((x) => [estadoEtiqueta(x.estado), x.cantidad])],
    };
  }
  if (tipo === "reservas_empleado" && isPorEmpleado(datos)) {
    return {
      title: "Serie - Reservas por empleado",
      rows: [["Empleado", "Cantidad"], ...datos.map((x) => [x.empleado, x.cantidad])],
    };
  }
  if (tipo === "ingresos_tour" && isPorTour(datos)) {
    return {
      title: "Serie - Ingresos por tour",
      rows: [["Tour", "Ingresos USD"], ...datos.map((x) => [x.tour, x.ingresos])],
    };
  }
  return { title: "Serie grafico", rows: [["Sin datos"]] };
}

function isTiempoCantidad(d: unknown): d is GraficoReservasTiempo[] {
  return (
    Array.isArray(d) &&
    d.length > 0 &&
    d.every(
      (x) =>
        x &&
        typeof x === "object" &&
        "periodo" in x &&
        "cantidad" in x &&
        typeof (x as GraficoReservasTiempo).cantidad === "number",
    )
  );
}

function isTiempoIngresos(d: unknown): d is GraficoIngresosTiempo[] {
  return (
    Array.isArray(d) &&
    d.length > 0 &&
    d.every(
      (x) =>
        x &&
        typeof x === "object" &&
        "periodo" in x &&
        "ingresos" in x &&
        typeof (x as GraficoIngresosTiempo).ingresos === "number",
    )
  );
}

function isPorEstado(d: unknown): d is GraficoReservasEstado[] {
  return (
    Array.isArray(d) &&
    d.length > 0 &&
    d.every(
      (x) =>
        x &&
        typeof x === "object" &&
        "estado" in x &&
        "cantidad" in x &&
        typeof (x as GraficoReservasEstado).cantidad === "number",
    )
  );
}

function isPorEmpleado(d: unknown): d is GraficoReservasEmpleado[] {
  return (
    Array.isArray(d) &&
    d.length > 0 &&
    d.every(
      (x) =>
        x &&
        typeof x === "object" &&
        "empleado" in x &&
        "cantidad" in x &&
        typeof (x as GraficoReservasEmpleado).cantidad === "number",
    )
  );
}

function isPorTour(d: unknown): d is GraficoIngresosTour[] {
  return (
    Array.isArray(d) &&
    d.length > 0 &&
    d.every(
      (x) =>
        x &&
        typeof x === "object" &&
        "tour" in x &&
        "ingresos" in x &&
        typeof (x as GraficoIngresosTour).ingresos === "number",
    )
  );
}

function formatFilenameDate(isoDate: string): string {
  return formatDdMmYyyy(isoDate).replace(/\//g, "-");
}

export function buildExportBasename(data: ReportsData): string {
  const tipo = safeFilenamePart(TIPO_FILENAME[data.tipo_reporte] ?? data.tipo_reporte) || "Reporte";
  const fi = safeFilenamePart(formatFilenameDate(data.periodo.fecha_inicio)) || "inicio";
  const ff = safeFilenamePart(formatFilenameDate(data.periodo.fecha_fin)) || "fin";
  const raw = `Reporte_${tipo}_${fi}_a_${ff}`;
  return raw.slice(0, 120);
}

export async function downloadReportExcel(data: ReportsData, basename: string): Promise<void> {
  const workbook = new Workbook();
  workbook.creator = "CRM";
  workbook.created = new Date();

  const ws1 = workbook.addWorksheet("Resumen", {
    views: [{ showGridLines: true }],
  });

  ws1.columns = [
    { key: "a", width: 34 },
    { key: "b", width: 30 },
    { key: "c", width: 34 },
    { key: "d", width: 30 },
  ];

  ws1.mergeCells("A1:D1");
  ws1.getCell("A1").value = "Reporte CRM";
  ws1.getCell("A1").font = { bold: true, size: 16, color: { argb: "FF2B3418" } };
  ws1.getCell("A1").alignment = { horizontal: "center" };

  ws1.getCell("A3").value = "Tipo de reporte";
  ws1.getCell("B3").value = TIPO_LABEL[data.tipo_reporte] ?? data.tipo_reporte;
  ws1.getCell("A4").value = "Periodo";
  ws1.getCell("B4").value = formatPeriodoLine(data.periodo.fecha_inicio, data.periodo.fecha_fin);
  ws1.getCell("A5").value = "Agrupacion temporal";
  ws1.getCell("B5").value = granularidadLabel(data.granularidad_temporal) ?? "No aplica";
  ws1.getCell("A6").value = "Generado";
  ws1.getCell("B6").value = formatGeneratedAt();

  ["A3", "A4", "A5", "A6"].forEach((addr) => {
    ws1.getCell(addr).font = { bold: true, color: { argb: "FF3E4C23" } };
  });

  ws1.getCell("A8").value = "Indicador";
  ws1.getCell("B8").value = "Valor";
  ["A8", "B8"].forEach((addr) => {
    ws1.getCell(addr).font = { bold: true, color: { argb: "FFFFFFFF" } };
    ws1.getCell(addr).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF607536" },
    };
    ws1.getCell(addr).alignment = { horizontal: "center" };
  });

  const kRows: Array<[string, number | string]> = [
    ["Total reservas", data.kpis.total_reservas],
    ["Canceladas", data.kpis.reservas_canceladas],
    ["No canceladas", data.kpis.reservas_no_canceladas],
    ["% cancelaciones", `${data.kpis.porcentaje_cancelaciones}%`],
    ["Ingresos totales", data.kpis.total_ingresos],
    ["Descuentos", data.kpis.total_descuentos],
    ["IVA", data.kpis.total_iva],
    ["Promedio por reserva", data.kpis.promedio_reserva],
  ];

  kRows.forEach((r, idx) => {
    const rowNo = 9 + idx;
    ws1.getCell(`A${rowNo}`).value = r[0];
    ws1.getCell(`B${rowNo}`).value = r[1] as any;
    if (idx >= 4) {
      ws1.getCell(`B${rowNo}`).numFmt = '"$"#,##0.00';
    }
    if (idx % 2 === 0) {
      ws1.getCell(`A${rowNo}`).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFFCFBF4" },
      };
      ws1.getCell(`B${rowNo}`).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFFCFBF4" },
      };
    }
  });

  const chart = chartSectionCsv(data.tipo_reporte, data.datosGrafico);
  const chartTitleRow = 19;
  ws1.getCell(`A${chartTitleRow}`).value = chart.title;
  ws1.getCell(`A${chartTitleRow}`).font = { bold: true, color: { argb: "FF3E4C23" } };

  const chartUrl = renderReportChartToDataUrl(data.tipo_reporte, data.datosGrafico);
  let chartTableStart = chartTitleRow + 1;
  if (chartUrl) {
    const base64 = chartUrl.split(",")[1];
    if (base64) {
      const imageId = workbook.addImage({ base64, extension: "png" });
      ws1.addImage(imageId, {
        tl: { col: 0, row: chartTitleRow },
        ext: { width: Math.round(PDF_CHART_DIM.widthPx * 0.62), height: Math.round(PDF_CHART_DIM.heightPx * 0.62) },
      });
      chartTableStart = chartTitleRow + 13;
    }
  }

  chart.rows.forEach((row, i) => {
    const rowNo = chartTableStart + i;
    row.forEach((v, c) => {
      const colLetter = String.fromCharCode(65 + c);
      ws1.getCell(`${colLetter}${rowNo}`).value = v as any;
      if (i === 0 && chart.rows.length > 1) {
        ws1.getCell(`${colLetter}${rowNo}`).font = { bold: true, color: { argb: "FFFFFFFF" } };
        ws1.getCell(`${colLetter}${rowNo}`).fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF3E4C23" },
        };
      }
    });
  });

  const ws2 = workbook.addWorksheet("Detalle de reservas");
  ws2.columns = [
    { header: "reservation_id", key: "reservation_id", width: 14 },
    { header: "numero_reserva_hotel", key: "hotel_reservation", width: 20 },
    { header: "tour", key: "tour", width: 28 },
    { header: "fecha", key: "fecha", width: 14 },
    { header: "hora", key: "hora", width: 10 },
    { header: "estado", key: "estado", width: 14 },
    { header: "tipo_reserva", key: "tipo_reserva", width: 16 },
    { header: "personas", key: "personas", width: 10 },
    { header: "empleado", key: "empleado", width: 18 },
    { header: "transfer", key: "transfer", width: 16 },
    { header: "tour_amount", key: "tour_amount", width: 14 },
    { header: "transfer_amount", key: "transfer_amount", width: 16 },
    { header: "subtotal", key: "subtotal", width: 14 },
    { header: "iva", key: "iva", width: 12 },
    { header: "discount", key: "discount", width: 14 },
    { header: "total", key: "total", width: 14 },
  ];

  ws2.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  ws2.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF607536" },
  };
  ws2.views = [{ state: "frozen", ySplit: 1 }];

  data.reservas.forEach((r) => {
    ws2.addRow({
      reservation_id: r.reservation_id,
      hotel_reservation: r.hotel_reservation,
      tour: r.tour?.name ?? "",
      fecha: formatReservationDateForExport(String(r.date)),
      hora: formatReservationTimeForExport(r.time),
      estado: estadoEtiqueta(r.state),
      tipo_reserva: r.transfer_id != null ? "con_transfer" : "sin_transfer",
      personas: r.people,
      empleado: r.app_user?.username ?? r.employee_user,
      transfer: r.transfer_id != null ? String(r.transfer_id) : "",
      tour_amount: num((r as any).tour_amount),
      transfer_amount: num((r as any).transfer_amount),
      subtotal: num((r as any).subtotal),
      iva: num(r.iva),
      discount: num(r.discount),
      total: num(r.total),
    });
  });

  [
    "K",
    "L",
    "M",
    "N",
    "O",
    "P",
  ].forEach((col) => {
    ws2.getColumn(col).numFmt = '"$"#,##0.00';
  });

  ws2.eachRow((row, idx) => {
    if (idx > 1 && idx % 2 === 0) {
      row.eachCell((cell) => {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFFCFBF4" },
        };
      });
    }
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  triggerDownload(blob, `${basename}.xlsx`);
}

type PdfWithAutoTable = jsPDF & { lastAutoTable?: { finalY: number } };

const PDF_MARGIN_MM = 14;

function ensureSpace(doc: jsPDF, y: number, neededMm: number): number {
  const pageH = doc.internal.pageSize.getHeight();
  if (y + neededMm > pageH - PDF_MARGIN_MM) {
    doc.addPage();
    return PDF_MARGIN_MM + 8;
  }
  return y;
}

function pdfSectionRule(doc: jsPDF, y: number, pageW: number): number {
  doc.setDrawColor(195, 206, 171);
  doc.setLineWidth(0.3);
  doc.line(PDF_MARGIN_MM, y, pageW - PDF_MARGIN_MM, y);
  return y + 4;
}

export function downloadReportPdf(data: ReportsData, basename: string): void {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  let y = PDF_MARGIN_MM;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.setTextColor(43, 52, 24);
  doc.text("Reporte operativo", pageW / 2, y, { align: "center" });
  y += 9;

  doc.setFontSize(11);
  doc.text(TIPO_LABEL[data.tipo_reporte] ?? data.tipo_reporte, pageW / 2, y, {
    align: "center",
  });
  y += 9;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(90, 99, 83);
  doc.text(
    `Periodo analizado: ${formatPeriodoLine(data.periodo.fecha_inicio, data.periodo.fecha_fin)}`,
    PDF_MARGIN_MM,
    y,
  );
  y += 5;
  const gLabel = granularidadLabel(data.granularidad_temporal);
  if (gLabel) {
    doc.text(`Agrupacion temporal: ${gLabel}`, PDF_MARGIN_MM, y);
    y += 5;
  }
  doc.text(`Documento generado: ${formatGeneratedAt()}`, PDF_MARGIN_MM, y);
  y += 11;

  doc.setTextColor(43, 52, 24);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("1. Indicadores clave", PDF_MARGIN_MM, y);
  y = pdfSectionRule(doc, y + 2, pageW);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);

  const k = data.kpis;
  autoTable(doc, {
    startY: y,
    head: [["Indicador", "Valor"]],
    body: [
      ["Total reservas", String(k.total_reservas)],
      ["Canceladas", String(k.reservas_canceladas)],
      ["No canceladas", String(k.reservas_no_canceladas)],
      ["Porcentaje de cancelaciones", `${k.porcentaje_cancelaciones}%`],
      ["Ingresos totales", formatUsd(k.total_ingresos)],
      ["Descuentos", formatUsd(k.total_descuentos)],
      ["IVA", formatUsd(k.total_iva)],
      ["Promedio por reserva", formatUsd(k.promedio_reserva)],
    ],
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: {
      fillColor: [96, 117, 54],
      textColor: 255,
      fontStyle: "bold",
    },
    alternateRowStyles: { fillColor: [252, 251, 244] },
    margin: { left: PDF_MARGIN_MM, right: PDF_MARGIN_MM },
  });

  y = (doc as PdfWithAutoTable).lastAutoTable?.finalY ?? y + 50;
  y += 12;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(43, 52, 24);
  doc.text("2. Visualizacion del periodo", PDF_MARGIN_MM, y);
  y = pdfSectionRule(doc, y + 2, pageW);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(90, 99, 83);
  doc.text(
    "El grafico resume los mismos datos que ve en pantalla en el panel de reportes.",
    PDF_MARGIN_MM,
    y,
    { maxWidth: pageW - 2 * PDF_MARGIN_MM },
  );
  y += 12;

  const chartUrl = renderReportChartToDataUrl(data.tipo_reporte, data.datosGrafico);
  const imgWidthMm = pageW - 2 * PDF_MARGIN_MM;
  const imgHeightMm =
    (imgWidthMm * PDF_CHART_DIM.heightPx) / PDF_CHART_DIM.widthPx;

  y = ensureSpace(doc, y, chartUrl ? imgHeightMm + 18 : 14);

  if (chartUrl) {
    doc.addImage(chartUrl, "PNG", PDF_MARGIN_MM, y, imgWidthMm, imgHeightMm);
    y += imgHeightMm + 10;
  } else {
    doc.setFontSize(10);
    doc.text(
      "No hay datos suficientes para dibujar el grafico con los filtros actuales.",
      PDF_MARGIN_MM,
      y,
    );
    y += 10;
  }

  doc.setTextColor(43, 52, 24);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Cifras del grafico (detalle numerico)", PDF_MARGIN_MM, y);
  y += 6;

  const chart = chartSectionCsv(data.tipo_reporte, data.datosGrafico);
  const chartHead =
    chart.rows.length > 1 ? chart.rows[0]?.map(String) ?? [] : [];
  const chartBody =
    chart.rows.length > 1
      ? chart.rows.slice(1).map((row) => row.map(String))
      : chart.rows.map((row) => row.map(String));

  y = ensureSpace(doc, y, 40);
  autoTable(doc, {
    startY: y,
    head: chart.rows.length > 1 ? [chartHead] : [],
    body: chartBody,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: {
      fillColor: [62, 76, 35],
      textColor: 255,
      fontStyle: "bold",
    },
    alternateRowStyles: { fillColor: [252, 251, 244] },
    margin: { left: PDF_MARGIN_MM, right: PDF_MARGIN_MM },
  });

  y = (doc as PdfWithAutoTable).lastAutoTable?.finalY ?? y + 30;
  y += 14;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("3. Detalle de reservas", PDF_MARGIN_MM, y);
  y = pdfSectionRule(doc, y + 2, pageW);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(90, 99, 83);
  doc.text(
    "Listado de reservas incluidas en esta exportacion (misma vista que la tabla del sistema).",
    PDF_MARGIN_MM,
    y,
    { maxWidth: pageW - 2 * PDF_MARGIN_MM },
  );
  y += 10;
  doc.setTextColor(0, 0, 0);

  const resBody = data.reservas.map((r) => [
    String(r.reservation_id),
    (r.tour?.name ?? "").slice(0, 34),
    formatReservationDateForExport(
      typeof r.date === "string" ? r.date : String(r.date),
    ),
    formatReservationTimeForExport(r.time),
    estadoEtiqueta(r.state),
    String(r.people),
    (r.app_user?.username ?? r.employee_user).slice(0, 14),
    r.transfer_id != null ? "Si" : "No",
    formatUsd(num(r.total)),
    formatUsd(num(r.discount)),
    formatUsd(num(r.iva)),
  ]);

  y = ensureSpace(doc, y, 30);
  autoTable(doc, {
    startY: y,
    head: [
      [
        "ID",
        "Tour",
        "Fecha",
        "Hora",
        "Estado",
        "Pers.",
        "Empleado",
        "Trans.",
        "Total",
        "Desc.",
        "IVA",
      ],
    ],
    body: resBody,
    styles: { fontSize: 7, cellPadding: 1.5 },
    headStyles: {
      fillColor: [96, 117, 54],
      textColor: 255,
      fontStyle: "bold",
    },
    alternateRowStyles: { fillColor: [252, 251, 244] },
    margin: { left: PDF_MARGIN_MM, right: PDF_MARGIN_MM },
    horizontalPageBreak: true,
  });

  doc.save(`${basename}.pdf`);
}

/**
 * Obtiene hasta 1000 filas (max. API) para exportar el detalle completo cuando el usuario pagino.
 */
export async function resolveReportForExport(
  snapshot: ReportsData,
  query: ReportQueryParams,
): Promise<{ data: ReportsData; warning?: string }> {
  const total = snapshot.pagination.total;
  const loaded = snapshot.reservas.length;

  if (total === 0 || loaded >= total) {
    return { data: snapshot };
  }

  const limit = Math.min(1000, total);
  const res = await fetchReports({ ...query, page: 1, limit });
  if (!res.success) {
    throw new Error(res.error ?? "No se pudieron cargar los datos para exportar.");
  }

  let warning: string | undefined;
  if (total > 1000) {
    warning = `El archivo incluye solo las primeras 1000 de ${total} reservas (limite del servidor). Acote fechas o filtros para exportar por partes.`;
  }

  return { data: res.data, warning };
}
