import React, { useState, useEffect, useMemo } from 'react';
import { Row, Col, Button, Input } from 'reactstrap';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { useTranslation } from 'react-i18next'; // Import translation hook
import './poll.css';

const COLORS = ['#F14E3B', '#0C8B8D', '#14213D', '#F9A826', '#4361EE'];

const PollStatsChart = ({ poll, detailed = false, onExport, onClose }) => {
  // Initialize translation hook
  const { t } = useTranslation();
  
  const [stats, setStats] = useState({
    totalVotes: 0,
    participationRate: 0,
    mostPopularOptions: [],
    totalParticipants: 0,
    uniqueRespondents: 0
  });
  
  // Add state for selected question
  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState(0);

  useEffect(() => {
    if (!poll) return;

    // Get participant count - use the most accurate source available
    let totalParticipants = 0;

    // 1. First try to use event.attendees if available (most accurate)
    if (poll.event?.attendees?.length) {
      totalParticipants = poll.event.attendees.length;
    }
    // 2. Next try to use the participantCount property if it was set
    else if (poll.participantCount && typeof poll.participantCount === 'number') {
      totalParticipants = poll.participantCount;
    }
    // 3. If poll has an eventId, try to extract participant count from responses
    else if (poll.event) {
      // If we have a reasonable number of responses, use that as minimum
      totalParticipants = Math.max(2, poll.responses?.length || 0); 
    }
    // 4. Fallback: Default to 2 as a reasonable minimum for testing
    else {
      totalParticipants = 2;
    }

    // Safety check - ensure we have a positive number
    totalParticipants = Math.max(totalParticipants, 1);
    
    // Calculate UNIQUE respondents (not total responses)
    const uniqueRespondents = new Set();
    
    if (poll.responses && Array.isArray(poll.responses)) {
      poll.responses.forEach(response => {
        // Handle both object and string user IDs
        const userId = typeof response.user === 'object' ? response.user._id : response.user;
        if (userId) {
          uniqueRespondents.add(userId);
        }
      });
    }
    
    // Count total votes (responses)
    const totalVotes = poll.responses?.length || 0;
    
    // Calculate participation rate based on UNIQUE respondents
    const participationRate = Math.round((uniqueRespondents.size / totalParticipants) * 100);

    // Find top answer for each question
    const mostPopularOptions = [];
    
    // Handle polls with a questions array
    if (poll.questions && Array.isArray(poll.questions)) {
      poll.questions.forEach((question, qIndex) => {
        let max = 0;
        let topOption = '';
        
        if (question.options && Array.isArray(question.options)) {
          question.options.forEach(opt => {
            if ((opt.votes || 0) > max) {
              max = opt.votes || 0;
              topOption = opt.text;
            }
          });
          
          if (topOption) {
            mostPopularOptions.push({
              questionTitle: question.title,
              questionIndex: qIndex,
              optionText: topOption,
              votes: max
            });
          }
        }
      });
    } 
    // Handle polls with options directly on the poll object
    else if (poll.options && Array.isArray(poll.options)) {
      let max = 0;
      let topOption = '';
      
      poll.options.forEach(opt => {
        if ((opt.votes || 0) > max) {
          max = opt.votes || 0;
          topOption = opt.text;
        }
      });
      
      if (topOption) {
        mostPopularOptions.push({
          questionTitle: poll.title,
          questionIndex: 0,
          optionText: topOption,
          votes: max
        });
      }
    }

    setStats({ 
      totalVotes, 
      participationRate, 
      mostPopularOptions,
      totalParticipants,
      uniqueRespondents: uniqueRespondents.size
    });
  }, [poll]);

  // Get all available questions
  const questions = useMemo(() => {
    if (!poll) return [];
    
    if (poll.questions && Array.isArray(poll.questions)) {
      return poll.questions.map((q, index) => ({ 
        title: q.title || `${t('pollStats.question')} ${index+1}`, 
        index 
      }));
    } 
    
    // For polls without questions array
    return [{ title: poll.title || t('pollStats.question'), index: 0 }];
  }, [poll, t]);

  if (!poll) return null;

  // For donut chart
  const data = [
    { name: t('pollStats.chart.participated'), value: stats.participationRate },
    { name: t('pollStats.chart.remaining'), value: Math.max(0, 100 - stats.participationRate) }
  ];

  // Find the selected question's top answer
  const getSelectedTopAnswer = () => {
    if (stats.mostPopularOptions.length === 0) {
      return { text: t('pollStats.noVotesYet'), votes: 0 };
    }
    
    // Find the option for the selected question
    const selectedOption = stats.mostPopularOptions.find(
      opt => opt.questionIndex === selectedQuestionIndex
    ) || stats.mostPopularOptions[0]; // Fallback to first question
    
    return {
      text: selectedOption.optionText,
      votes: selectedOption.votes
    };
  };

  const selectedTopAnswer = getSelectedTopAnswer();

  return (
    <div className="poll-stats-container">
      {/* Only have the title once at the top */}
      <div className="poll-stats-header">
        <div className="d-flex align-items-center mb-2">
          <div className="poll-stats-icon">
            <i className="ri-bar-chart-2-line"></i>
          </div>
          <h5 className="poll-stats-title">{t('pollStats.title')}</h5>
        </div>
        <div className="poll-title">{poll.title || t('pollStats.pollResults')}</div>
      </div>
      
      {detailed ? (
        <div className="poll-detailed-view">
          {/* Stats cards */}
          <Row className="stats-row">
            <Col md={4}>
              <div className="stat-card">
                <div className="stat-icon">
                  <i className="ri-user-voice-line"></i>
                </div>
                <h2 className="stat-number">{stats.totalVotes}</h2>
                <div className="stat-label">{t('pollStats.stats.totalVotes')}</div>
              </div>
            </Col>
            <Col md={4}>
              <div className="stat-card">
                <div className="stat-icon participation-icon">
                  <i className="ri-pie-chart-line"></i>
                </div>
                <h2 className="stat-number">{stats.participationRate}%</h2>
                <div className="stat-label">
                  {t('pollStats.stats.participationRate')}
                  <div className="stat-sublabel">
                    {t('pollStats.stats.participationDetail', { 
                      responded: stats.uniqueRespondents, 
                      total: stats.totalParticipants 
                    })}
                  </div>
                </div>
              </div>
            </Col>
            <Col md={4}>
              <div className="stat-card">
                <div className="stat-icon top-answer-icon">
                  <i className="ri-trophy-line"></i>
                </div>
                <div className="stat-top-answer">
                  <div className="stat-number top-answer">
                    {selectedTopAnswer.text}
                    {selectedTopAnswer.votes > 0 && (
                      <span className="top-answer-votes">
                        ({t('pollStats.stats.votes', { count: selectedTopAnswer.votes })})
                      </span>
                    )}
                  </div>
                  {questions.length > 1 && (
                    <div className="question-selector">
                      <select
                        className="form-select form-select-sm"
                        value={selectedQuestionIndex}
                        onChange={(e) => setSelectedQuestionIndex(parseInt(e.target.value))}
                      >
                        {questions.map((q, i) => (
                          <option key={i} value={q.index}>
                            {q.title}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
                <div className="stat-label">
                  {t('pollStats.stats.topAnswer')}
                </div>
              </div>
            </Col>
          </Row>

          {/* Charts section - removed redundant titles */}
          <Row className="charts-row">
            <Col md={5}>
              <div className="chart-card">
                <h6 className="chart-title">{t('pollStats.chart.participationTitle')}</h6>
                <div className="chart-container">
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={data}
                        dataKey="value"
                        innerRadius={70}
                        outerRadius={90}
                        paddingAngle={4}
                        strokeWidth={0}
                      >
                        <Cell fill="#F14E3B" />
                        <Cell fill="#0C8B8D" />
                      </Pie>
                      <Tooltip formatter={(value) => `${value}%`} />
                      <Legend 
                        layout="vertical" 
                        verticalAlign="middle" 
                        align="right"
                        iconType="circle"
                        wrapperStyle={{ paddingLeft: "20px" }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="donut-center">
                    <div className="donut-percentage">{stats.participationRate}%</div>
                  </div>
                </div>
              </div>
            </Col>
            <Col md={7}>
              <div className="chart-card">
                <h6 className="chart-title">{t('pollStats.chart.results')}</h6>
                <div className="results-container">
                  {(poll.questions ? poll.questions : [{ ...poll, options: poll.options }]).map((q, qi) => (
                    <div key={qi} className="question-results">
                      {q.title && (
                        <div className="question-title">
                          <i className="ri-question-line me-1"></i>
                          {q.title}
                        </div>
                      )}
                      {q.options?.map((opt, oi) => {
                        const total = q.options.reduce((sum, o) => sum + (o.votes || 0), 0);
                        const pct = total ? Math.round((opt.votes || 0) / total * 100) : 0;
                        return (
                          <div key={oi} className="option-result">
                            <div className="d-flex justify-content-between">
                              <div className="option-text">{opt.text}</div>
                              <div className="option-stats">
                                <span className="option-percentage">{pct}%</span>
                                <span className="option-votes">
                                  {t('pollStats.stats.votes', { count: opt.votes || 0 })}
                                </span>
                              </div>
                            </div>
                            <div className="progress-container">
                              <div className="progress-bar" style={{width: `${pct}%`}}></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </Col>
          </Row>

          {/* Actions */}
          <div className="actions-container">
            <Button color="light" className="me-2" onClick={onClose}>
              <i className="ri-close-line me-1"></i>
              {t('pollStats.buttons.close')}
            </Button>
            {onExport && (
              <Button color="primary" onClick={onExport}>
                <i className="ri-download-line me-1"></i>
                {t('pollStats.buttons.exportPDF')}
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="simplified-stats">
          <div className="simplified-indicators">
            <div className="simplified-stat">
              <i className="ri-user-voice-line"></i>
              <span>{t('pollStats.simplified.votes', { count: stats.totalVotes })}</span>
            </div>
            <div className="simplified-stat">
              <i className="ri-pie-chart-line"></i>
              <span>{t('pollStats.simplified.participation', { rate: stats.participationRate })}</span>
            </div>
          </div>
          <div className="simplified-answer">
            <div className="simplified-answer-label">{t('pollStats.simplified.topAnswer')}:</div>
            <div className="simplified-answer-value">{selectedTopAnswer.text}</div>
          </div>
        </div>
      )}

      <style jsx>{`
        /* Poll Statistics Styles */
        .poll-stats-container {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', sans-serif;
          background-color: white;
          border-radius: 10px;
          padding: 20px;
          color: #333;
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        }

        /* Header */
        .poll-stats-header {
          margin-bottom: 20px;
          padding-bottom: 15px;
          border-bottom: 1px solid #f0f0f0;
        }

        .poll-stats-icon {
          width: 32px;
          height: 32px;
          background-color: rgba(3, 169, 244, 0.1);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #03A9F4;
          font-size: 18px;
          margin-right: 12px;
        }

        .poll-stats-title {
          font-size: 18px;
          font-weight: 600;
          margin: 0;
        }

        .poll-title {
          color: #666;
          font-size: 14px;
          margin-top: 5px;
          margin-left: 44px;
        }

        /* Stats cards */
        .stats-row {
          margin-bottom: 20px;
        }

        .stat-card {
          background-color: #f8f9fa;
          border-radius: 10px;
          padding: 16px;
          text-align: center;
          height: 100%;
          box-shadow: 0 2px 4px rgba(0,0,0,0.03);
        }

        .stat-icon {
          width: 45px;
          height: 45px;
          border-radius: 50%;
          background-color: #F14E3B;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          margin: 0 auto 12px;
        }

        .participation-icon {
          background-color: #0C8B8D;
        }

        .top-answer-icon {
          background-color: #14213D;
        }

        .stat-number {
          font-size: 24px;
          font-weight: 700;
          margin-bottom: 8px;
          line-height: 1.2;
        }

        .top-answer {
          font-size: 16px;
          word-break: break-word;
        }

        .top-answer-votes {
          display: block;
          font-size: 14px;
          color: #666;
          font-weight: 500;
          margin-top: 5px;
        }

        .question-selector {
          margin-top: 8px;
          margin-bottom: 5px;
        }

        .question-selector select {
          font-size: 12px;
          padding: 4px 8px;
          border-radius: 4px;
          border: 1px solid #ddd;
          width: 100%;
        }

        .stat-label {
          font-size: 14px;
          color: #555;
          font-weight: 500;
        }

        .stat-sublabel {
          font-size: 12px;
          color: #888;
          margin-top: 4px;
        }

        /* Charts */
        .charts-row {
          margin-bottom: 20px;
        }

        .chart-card {
          background-color: #fff;
          border-radius: 10px;
          padding: 16px;
          height: 100%;
          border: 1px solid #f0f0f0;
        }

        .chart-title {
          font-size: 15px;
          font-weight: 600;
          color: #444;
          margin-bottom: 16px;
          padding-bottom: 10px;
          border-bottom: 1px solid #f0f0f0;
        }

        .chart-container {
          position: relative;
          height: 300px;
        }

        /* Fix for the donut chart percentage centering */
        .donut-center {
          position: absolute;
          top: 50%;
          left: 40%; /* Adjusted to center with the legend */
          transform: translate(-50%, -50%);
          text-align: center;
          pointer-events: none;
        }

        .donut-percentage {
          font-size: 32px;
          font-weight: 700;
          color: #333;
        }

        /* Results */
        .results-container {
          max-height: 320px;
          overflow-y: auto;
          padding-right: 5px;
        }

        .results-container::-webkit-scrollbar {
          width: 5px;
        }

        .results-container::-webkit-scrollbar-thumb {
          background-color: rgba(0,0,0,0.2);
          border-radius: 3px;
        }

        .question-results {
          margin-bottom: 20px;
        }

        .question-title {
          background-color: rgba(12, 139, 141, 0.1);
          color: #0C8B8D;
          padding: 8px 12px;
          border-radius: 6px;
          font-weight: 500;
          font-size: 14px;
          margin-bottom: 12px;
        }

        .option-result {
          margin-bottom: 12px;
        }

        .option-text {
          font-size: 14px;
          margin-bottom: 5px;
          flex: 1;
          padding-right: 10px;
        }

        .option-stats {
          display: flex;
          align-items: center;
          white-space: nowrap;
        }

        .option-percentage {
          background-color: #0C8B8D;
          color: white;
          border-radius: 12px;
          padding: 2px 8px;
          font-size: 13px;
          font-weight: 500;
          margin-right: 8px;
        }

        .option-votes {
          font-size: 13px;
          color: #888;
        }

        /* Fix for the progress bar inconsistency */
        .progress-container {
          height: 8px;
          background-color: rgba(12, 139, 141, 0.1);
          border-radius: 4px;
          overflow: hidden;
          margin-top: 5px;
        }

        .progress-bar {
          height: 100%;
          background-color: #0C8B8D;
          border-radius: 0; /* Make it consistent by removing border radius */
          transition: width 0.8s ease;
        }

        /* Actions */
        .actions-container {
          margin-top: 20px;
          padding-top: 15px;
          border-top: 1px solid #f0f0f0;
          text-align: right;
        }

        /* Simplified view */
        .simplified-stats {
          text-align: center;
          padding: 15px 0;
        }

        .simplified-indicators {
          display: flex;
          justify-content: center;
          gap: 15px;
          margin-bottom: 15px;
          flex-wrap: wrap;
        }

        .simplified-stat {
          display: flex;
          align-items: center;
          gap: 8px;
          background-color: #f8f9fa;
          border-radius: 20px;
          padding: 6px 14px;
          font-size: 14px;
          font-weight: 500;
        }

        .simplified-stat i {
          color: #0C8B8D;
        }

        .simplified-answer {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }

        .simplified-answer-label {
          font-size: 14px;
          color: #666;
        }

        .simplified-answer-value {
          font-weight: 600;
          font-size: 16px;
        }
      `}</style>
    </div>
  );
};

export default PollStatsChart;