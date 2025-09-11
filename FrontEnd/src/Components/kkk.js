  {/* Gamification Content */}
          <div className="nestly-card-header" >
          <Row>
            <Col lg={12}>
              <Card>
                <CardHeader className="nestly-card-header align-items-center d-flex">
                  <h4 className="card-title mb-0 flex-grow-1">{t('gamification.activities')}</h4>
                </CardHeader>

                <CardBody>
                  <Nav tabs className="nav-tabs-custom rounded card-header-tabs border-bottom-0 mb-4">
                    <NavItem>
                      <NavLink
                        className={activeTab === 'achievements' ? 'active' : ''}
                        onClick={() => setActiveTab('achievements')}
                        style={{ cursor: 'pointer' }}
                      >
                        <i className="ri-trophy-line me-1 align-bottom"></i> {t('gamification.achievements')}
                      </NavLink>
                    </NavItem>
                    <NavItem>
                      <NavLink
                        className={activeTab === 'leaderboard' ? 'active' : ''}
                        onClick={() => setActiveTab('leaderboard')}
                        style={{ cursor: 'pointer' }}
                      >
                        <i className="ri-medal-line me-1 align-bottom"></i> {t('gamification.leaderboard')}
                      </NavLink>
                    </NavItem>
                    <NavItem>
                      <NavLink
                        className={activeTab === 'rewards' ? 'active' : ''}
                        onClick={() => setActiveTab('rewards')}
                        style={{ cursor: 'pointer' }}
                      >
                        <i className="ri-gift-line me-1 align-bottom"></i> {t('gamification.rewards')}
                      </NavLink>
                    </NavItem>
                  </Nav>

                  <TabContent activeTab={activeTab} className="text-muted">
                    <TabPane tabId="achievements">
                      <Row>
                        <Col lg={8}>
                          <h5 className="mb-3">{t('gamification.yourAchievements')}</h5>
                          
                          {/* Achievement progress cards */}
                          <Card className="border">
                            <CardBody>
                              <div className="d-flex">
                                <div className="avatar-sm">
                                  <div className="avatar-title bg-light text-primary rounded-circle">
                                    <i className="ri-building-line fs-20"></i>
                                  </div>
                                </div>
                                <div className="flex-grow-1 ms-3">
                                  <h6 className="fs-15">{t('gamification.achievement1')}</h6>
                                  <p className="text-muted mb-2">{t('gamification.achievement1Desc')}</p>
                                  <div className="progress mb-2" style={{ height: "6px" }}>
                                    <div className="progress-bar bg-success" role="progressbar" style={{ width: "85%" }}></div>
                                  </div>
                                  <p className="text-muted mb-0">85% {t('gamification.complete')}</p>
                                </div>
                              </div>
                            </CardBody>
                          </Card>
                          
                          <Card className="border">
                            <CardBody>
                              <div className="d-flex">
                                <div className="avatar-sm">
                                  <div className="avatar-title bg-light text-primary rounded-circle">
                                    <i className="ri-calendar-check-line fs-20"></i>
                                  </div>
                                </div>
                                <div className="flex-grow-1 ms-3">
                                  <h6 className="fs-15">{t('gamification.achievement2')}</h6>
                                  <p className="text-muted mb-2">{t('gamification.achievement2Desc')}</p>
                                  <div className="progress mb-2" style={{ height: "6px" }}>
                                    <div className="progress-bar bg-warning" role="progressbar" style={{ width: "65%" }}></div>
                                  </div>
                                  <p className="text-muted mb-0">65% {t('gamification.complete')}</p>
                                </div>
                              </div>
                            </CardBody>
                          </Card>
                          
                          <Card className="border">
                            <CardBody>
                              <div className="d-flex">
                                <div className="avatar-sm">
                                  <div className="avatar-title bg-light text-primary rounded-circle">
                                    <i className="ri-user-star-line fs-20"></i>
                                  </div>
                                </div>
                                <div className="flex-grow-1 ms-3">
                                  <h6 className="fs-15">{t('gamification.achievement3')}</h6>
                                  <p className="text-muted mb-2">{t('gamification.achievement3Desc')}</p>
                                  <div className="progress mb-2" style={{ height: "6px" }}>
                                    <div className="progress-bar bg-primary" role="progressbar" style={{ width: "40%" }}></div>
                                  </div>
                                  <p className="text-muted mb-0">40% {t('gamification.complete')}</p>
                                </div>
                              </div>
                            </CardBody>
                          </Card>
                        </Col>
                        
                        <Col lg={4}>
                          <Card>
                            <CardHeader className="bg-light">
                              <h5 className="card-title mb-0">{t('gamification.levelProgress')}</h5>
                            </CardHeader>
                            <CardBody>
                              <div className="text-center">
                                <div className="avatar-xl mx-auto mb-4 position-relative">
                                  <span className="avatar-title bg-soft-primary text-primary rounded-circle fs-2">
                                    {userLevel}
                                  </span>
                                  <div className="avatar-xs position-absolute end-0 bottom-0">
                                    <span className="avatar-title bg-success rounded-circle fs-xs">
                                      <i className="ri-award-line"></i>
                                    </span>
                                  </div>
                                </div>
                                
                                <h5>{t('gamification.currentLevel')}: {userLevel}</h5>
                                <p className="text-muted mb-4">{userPoints} {t('gamification.points')}</p>
                                
                                <div className="mb-3">
                                  <div className="d-flex justify-content-between mb-1">
                                    <span>{Math.round(levelProgressPercentage)}%</span>
                                    <span>{t('gamification.nextLevel')}: {userLevel + 1}</span>
                                  </div>
                                  <div className="progress" style={{ height: "10px" }}>
                                    <div className="progress-bar bg-success" role="progressbar" 
                                      style={{ width: `${levelProgressPercentage}%` }} 
                                      aria-valuenow={levelProgressPercentage} aria-valuemin="0" aria-valuemax="100"></div>
                                  </div>
                                </div>
                                
                                <div className="d-flex justify-content-between">
                                  <div className="text-center">
                                    <h5 className="mb-0">{pointsFromPreviousLevel}</h5>
                                    <p className="text-muted">{t('gamification.levelStart')}</p>
                                  </div>
                                  <div className="text-center">
                                    <h5 className="mb-0">{pointsForNextLevel}</h5>
                                    <p className="text-muted">{t('gamification.levelEnd')}</p>
                                  </div>
                                </div>
                              </div>
                            </CardBody>
                          </Card>
                        </Col>
                      </Row>
                    </TabPane>

                    <TabPane tabId="leaderboard">
                      <h5 className="mb-3">{t('gamification.topPerformers')}</h5>
                      <p>{t('gamification.leaderboardDescription')}</p>
                      
                      {/* Leaderboard content would go here */}
                      <div className="text-center py-4">
                        <div className="avatar-lg mx-auto mb-4">
                          <div className="avatar-title bg-light text-primary rounded-circle fs-24">
                            <i className="ri-trophy-line"></i>
                          </div>
                        </div>
                        <h5>{t('gamification.leaderboardComingSoon')}</h5>
                        <p className="text-muted">{t('gamification.leaderboardMessage')}</p>
                      </div>
                    </TabPane>

                    <TabPane tabId="rewards">
                      <h5 className="mb-3">{t('gamification.availableRewards')}</h5>
                      <p>{t('gamification.rewardsDescription')}</p>
                      
                      {/* Rewards content would go here */}
                      <div className="text-center py-4">
                        <div className="avatar-lg mx-auto mb-4">
                          <div className="avatar-title bg-light text-primary rounded-circle fs-24">
                            <i className="ri-gift-line"></i>
                          </div>
                        </div>
                        <h5>{t('gamification.rewardsComingSoon')}</h5>
                        <p className="text-muted">{t('gamification.rewardsMessage')}</p>
                      </div>
                    </TabPane>
                  </TabContent>
                </CardBody>
              </Card>
            </Col>
          </Row>
          </div>