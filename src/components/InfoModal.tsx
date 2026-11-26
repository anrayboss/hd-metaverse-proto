import dictionaryRaw from '../data/dictionary.json';
import { TERM_MAP } from '../engine/hdCalculator';

const DICTIONARY = dictionaryRaw as Record<string, string>;

export interface InfoModalRequest {
  mode: 'Label' | 'Value';
  category: string;
  rawValue?: string;
}

export function resolveInfoModalContent(req: InfoModalRequest): { title: string; html: string } {
  let lookupKey = '';
  let title = '';

  if (req.mode === 'Label') {
    lookupKey = `Label_${req.category}`;
    title = `關於：${TERM_MAP[req.category] || req.category}`;
  } else {
    let rawValue = req.rawValue || '-';
    if (req.category === 'Authority' && rawValue.includes('Solar Plexus')) {
      rawValue = 'Emotional - Solar Plexus';
    }
    const chineseValue =
      req.category === 'Cross' ? rawValue : TERM_MAP[rawValue] || rawValue;
    lookupKey = `Value_${req.category}_${chineseValue}`;
    title = `關於：${chineseValue}`;
  }

  const content = DICTIONARY[lookupKey] || DICTIONARY.DEFAULT || '尚未建立此項目的說明資料。';
  return { title, html: content };
}

export function InfoModal({
  request,
  onClose,
}: {
  request: InfoModalRequest | null;
  onClose: () => void;
}) {
  if (!request) return null;
  const { title, html } = resolveInfoModalContent(request);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card info-modal-card" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="inspector-close" onClick={onClose}>
          ✕
        </button>
        <div className="info-modal-title">{title}</div>
        <div
          className="info-modal-body"
          dangerouslySetInnerHTML={{ __html: html.replace(/\n/g, '<br />') }}
        />
      </div>
    </div>
  );
}
