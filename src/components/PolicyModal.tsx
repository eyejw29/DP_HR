import React, { useState, useEffect } from 'react';
import { useAppContext } from '../store/AppContext';
import { X, Save } from 'lucide-react';

interface PolicyModalProps {
  type: 'LEGAL' | 'INTERNAL';
  onClose: () => void;
  readOnly?: boolean;
}

const PolicyModal: React.FC<PolicyModalProps> = ({ type, onClose, readOnly = false }) => {
  const { policyDocuments, updatePolicy } = useAppContext();
  
  const doc = policyDocuments.find(d => d.type === type);
  const [content, setContent] = useState('');

  useEffect(() => {
    if (doc) setContent(doc.content);
  }, [doc]);

  const handleSave = () => {
    if (!doc) return;
    if (window.confirm('정책 내용을 수정하시겠습니까?')) {
      updatePolicy(doc.id, content);
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-content" style={{ width: 600, height: 500, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ margin: 0 }}>
            {type === 'LEGAL' ? '법정 기준형 연차 제도 규정' : '내규형 / 강남 연차 제도 규정'}
          </h2>
          <button className="btn" onClick={onClose} style={{ padding: 8 }}><X size={18} /></button>
        </div>

        {readOnly ? (
          <div style={{ flex: 1, backgroundColor: 'var(--bg-secondary)', padding: 16, borderRadius: 8, overflowY: 'auto', whiteSpace: 'pre-wrap', lineHeight: 1.6, color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}>
            {content}
          </div>
        ) : (
          <textarea
            style={{ flex: 1, width: '100%', padding: 16, borderRadius: 8, border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', resize: 'none', lineHeight: 1.6, fontFamily: 'inherit' }}
            value={content}
            onChange={e => setContent(e.target.value)}
          />
        )}

        {!readOnly && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 20 }}>
            <button className="btn" onClick={onClose}>취소</button>
            <button className="btn btn-primary" onClick={handleSave}><Save size={16} /> 규정 수정 완료</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PolicyModal;
