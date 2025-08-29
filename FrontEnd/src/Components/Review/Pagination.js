import React from 'react';
import { Pagination as BsPagination, PaginationItem, PaginationLink } from 'reactstrap';

const Pagination = ({ itemsCount, itemsPerPage, currentPage, onPageChange }) => {
  const pagesCount = Math.ceil(itemsCount / itemsPerPage);
  
  if (pagesCount === 1) return null;
  
  // Create an array of page numbers
  const getPageNumbers = () => {
    const totalPages = pagesCount;
    const currentPageNum = currentPage;
    const pageNumbers = [];
    
    if (totalPages <= 5) {
      // Show all pages if 5 or less
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      // Always show first page
      pageNumbers.push(1);
      
      // Start 2 before current page if possible
      const startPage = Math.max(2, currentPageNum - 1);
      
      // Handle ellipsis at beginning if needed
      if (startPage > 2) {
        pageNumbers.push('...');
      }
      
      // Add pages around current page
      for (let i = startPage; i <= Math.min(totalPages - 1, currentPageNum + 1); i++) {
        pageNumbers.push(i);
      }
      
      // Handle ellipsis at end if needed
      if (currentPageNum + 1 < totalPages - 1) {
        pageNumbers.push('...');
      }
      
      // Always show last page
      if (totalPages > 1) {
        pageNumbers.push(totalPages);
      }
    }
    
    return pageNumbers;
  };

  return (
    <div className="d-flex justify-content-center mt-4">
      <BsPagination aria-label="Page navigation">
        <PaginationItem disabled={currentPage === 1}>
          <PaginationLink previous onClick={() => onPageChange(currentPage - 1)} />
        </PaginationItem>
        
        {getPageNumbers().map((page, index) => (
          <PaginationItem key={index} active={page === currentPage}>
            {page === '...' ? (
              <PaginationLink disabled className="px-3">
                ...
              </PaginationLink>
            ) : (
              <PaginationLink onClick={() => onPageChange(page)}>
                {page}
              </PaginationLink>
            )}
          </PaginationItem>
        ))}
        
        <PaginationItem disabled={currentPage === pagesCount}>
          <PaginationLink next onClick={() => onPageChange(currentPage + 1)} />
        </PaginationItem>
      </BsPagination>
    </div>
  );
};

export default Pagination;