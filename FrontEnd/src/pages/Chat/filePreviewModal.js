import React, { useState } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter, Button, Spinner, Alert } from 'reactstrap';
import { withTranslation } from 'react-i18next';

const FilePreviewModal = ({ isOpen, toggle, file, t }) => {
  const [videoLoading, setVideoLoading] = useState(true);
  const [videoError, setVideoError] = useState(false);
  const [downloadLoading, setDownloadLoading] = useState(false);

  if (!file) return null;

  // Helper to get file extension
  const getFileExtension = () => {
    return file.filename?.split('.').pop()?.toLowerCase() || '';
  };

  // Determine file types
  const fileExtension = getFileExtension();
  const isImage = file.type?.startsWith('image/') || 
                  ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(fileExtension);
  
  const isPDF = file.type === 'application/pdf' || fileExtension === 'pdf';
  
  const isVideo = file.type?.startsWith('video/') || 
                  ['mp4', 'webm', 'ogg', 'mkv', 'mov', 'avi'].includes(fileExtension);
  
  const isAudio = file.type?.startsWith('audio/') || 
                  ['mp3', 'wav', 'ogg', 'm4a'].includes(fileExtension);

  // Get appropriate MIME type for video
  const getVideoType = () => {
    if (file.type) return file.type;
    
    switch(fileExtension) {
      case 'mp4': return 'video/mp4';
      case 'webm': return 'video/webm';
      case 'ogg': return 'video/ogg';
      case 'mkv': return 'video/x-matroska';
      case 'mov': return 'video/quicktime';
      case 'avi': return 'video/x-msvideo';
      default: return 'video/mp4';
    }
  };

  // Render preview content based on file type
  const renderPreviewContent = () => {
    if (isImage) {
      return (
        <div className="text-center">
          <img 
            src={file.url} 
            alt={file.filename || t('chat.preview')} 
            className="img-fluid"
            style={{ maxHeight: '70vh' }}
            onError={() => setVideoError(true)}
          />
        </div>
      );
    } else if (isPDF) {
      return (
        <div style={{ height: '70vh' }}>
          <iframe 
            src={`${file.url}#toolbar=0`} 
            title={file.filename || t('chat.preview')}
            width="100%"
            height="100%"
            frameBorder="0"
          />
        </div>
      );
    } else if (isVideo) {
      return (
        <div className="text-center">
          {videoLoading && (
            <div className="py-5">
              <Spinner color="primary" />
              <p className="mt-2">{t('chat.loading')}</p>
            </div>
          )}
          
          {videoError ? (
            <Alert color="danger" className="m-3">
              {t('chat.failedToLoadVideo', 'Failed to load video. The format may not be supported.')}
              <div className="mt-2">
                <Button color="primary" size="sm" onClick={downloadFile}>
                  {t('chat.downloadInstead', 'Download Instead')}
                </Button>
              </div>
            </Alert>
          ) : (
            <video 
              controls 
              className="img-fluid" 
              style={{ maxHeight: '70vh', display: videoLoading ? 'none' : 'block' }}
              onCanPlay={() => setVideoLoading(false)}
              onError={() => {
                setVideoLoading(false);
                setVideoError(true);
              }}
              playsInline
            >
              <source src={file.url} type={getVideoType()} />
              {t('chat.browserNotSupportVideo', 'Your browser does not support HTML5 video.')}
            </video>
          )}
        </div>
      );
    } else if (isAudio) {
      return (
        <div className="text-center my-4">
          <audio 
            controls 
            className="w-100"
            onCanPlay={() => setVideoLoading(false)}
            onError={() => {
              setVideoLoading(false);
              setVideoError(true);
            }}
          >
            <source src={file.url} type={file.type || `audio/${fileExtension}`} />
            {t('chat.browserNotSupportAudio', 'Your browser does not support the audio element.')}
          </audio>
        </div>
      );
    } else {
      return (
        <div className="text-center py-5">
          <div className="mb-4">
            <i className={`ri-file-${getFileIcon()} text-primary`} style={{ fontSize: '4rem' }}></i>
          </div>
          <h4 className="mb-1">{file.filename || t('chat.file', 'File')}</h4>
          <p className="text-muted mb-4">{formatFileSize(file.size)}</p>
          <p>{t('chat.previewNotAvailable', 'Preview not available for this file type.')}</p>
        </div>
      );
    }
  };

  // Helper to determine file icon
  const getFileIcon = () => {
    const iconMap = {
      'doc': 'word', 'docx': 'word',
      'xls': 'excel', 'xlsx': 'excel',
      'ppt': 'ppt', 'pptx': 'ppt',
      'pdf': 'pdf',
      'zip': 'zip', 'rar': 'zip', '7z': 'zip',
      'txt': 'text', 'csv': 'text', 'json': 'code',
      'mp3': 'music', 'wav': 'music', 'm4a': 'music',
      'mp4': 'video', 'mkv': 'video', 'mov': 'video',
    };
    
    return iconMap[fileExtension] || 'line';
  };

  // Helper to format file size
  const formatFileSize = (sizeInBytes) => {
    if (!sizeInBytes) return t('chat.unknownSize', "Unknown size");
    
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = sizeInBytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(2)} ${units[unitIndex]}`;
  };

  // Download the file
  const downloadFile = async () => {
    setDownloadLoading(true);
    try {
      const response = await fetch(file.url);
      if (!response.ok) throw new Error(t('chat.failedToFetchFile', 'Failed to fetch file'));
      
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = blobUrl;
      link.setAttribute('download', file.filename || 'download');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up
      setTimeout(() => {
        window.URL.revokeObjectURL(blobUrl);
      }, 100);
    } catch (error) {
      console.error("Download failed:", error);
      setVideoError(true);
    } finally {
      setDownloadLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} toggle={toggle} size="lg" centered>
      <ModalHeader toggle={toggle}>
        <div className="d-flex align-items-center">
          <i className={`ri-file-${getFileIcon()} me-2 text-primary`}></i>
          <div className="text-truncate" style={{ maxWidth: '400px' }}>
            {file.filename || t('chat.preview')}
          </div>
        </div>
      </ModalHeader>
      <ModalBody className="p-0">
        {renderPreviewContent()}
      </ModalBody>
      <ModalFooter>
        <Button color="secondary" onClick={toggle}>{t('chat.close')}</Button>
        <Button 
          color="primary" 
          onClick={downloadFile}
          disabled={downloadLoading}
        >
          {downloadLoading ? (
            <>
              <Spinner size="sm" className="me-2" />
              {t('chat.downloading', 'Downloading...')}
            </>
          ) : (
            <>
              <i className="ri-download-2-line me-1"></i> {t('chat.download')}
            </>
          )}
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default withTranslation()(FilePreviewModal);