import React from "react";

function KitchenRushAdvancedPanel({
  copy,
  snapshot,
  orderGuides,
  formatTime,
  locale,
  onSelectIngredient,
  onAdjustStationTarget,
  onSetStationTarget,
}) {
  return (
    <>
      <section>
        <h5>{copy.objectiveTitle}</h5>
        <p>{copy.objectiveText}</p>
      </section>

      <section className="kitchen-rush-stats">
        <article><span>{copy.score}</span><strong>{snapshot.score}</strong></article>
        <article><span>{copy.combo}</span><strong>x{snapshot.combo}</strong></article>
        <article><span>{copy.mistakes}</span><strong>{snapshot.mistakes}</strong></article>
        <article><span>{copy.time}</span><strong>{formatTime(snapshot.remainingMs)}</strong></article>
      </section>

      <section>
        <h5>{copy.ingredientsTitle}</h5>
        <div className="kitchen-rush-ingredient-grid">
          {snapshot.availableIngredientTypes.map((ingredient) => (
            <button
              key={ingredient.type}
              type="button"
              className={ingredient.type === snapshot.selectedIngredientType ? "active" : ""}
              onClick={() => onSelectIngredient(ingredient.type)}
            >
              <span>{ingredient.key}</span>
              <strong>{ingredient.name}</strong>
            </button>
          ))}
        </div>
      </section>

      <section>
        <h5>{copy.ordersTitle}</h5>
        {snapshot.activeOrders.length === 0 ? (
          <p className="kitchen-rush-empty">{copy.noOrders}</p>
        ) : (
          <div className="kitchen-rush-order-list">
            {snapshot.activeOrders.map((order) => (
              <article key={order.id}>
                <header>
                  <strong>{order.recipeName}</strong>
                  <span>{Math.ceil(order.remainingMs / 1000)}s</span>
                </header>
                <p>{order.summary}</p>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="kitchen-rush-guide">
        <h5>{copy.guideTitle}</h5>
        {orderGuides.length === 0 ? (
          <p className="kitchen-rush-empty">{copy.guideEmpty}</p>
        ) : (
          <div className="kitchen-rush-guide-list">
            {orderGuides.map((order) => (
              <article key={`${order.id}-guide`} className="kitchen-rush-guide-card">
                <header>
                  <strong>{order.recipeName}</strong>
                  <span>{order.platedCount}/{order.stepsGuide.length}</span>
                </header>

                <ul className="kitchen-rush-guide-steps">
                  {order.stepsGuide.map((step) => (
                    <li key={`${order.id}-${step.type}-${step.state}`}>
                      <div className="kitchen-rush-guide-row">
                        <strong>{step.ingredientName}</strong>
                        <em>{step.progressLabel}</em>
                      </div>
                      <p>{copy.stepTarget}: {step.targetLabel}</p>
                      <p>{copy.stepStation}: {step.stationLabel}</p>
                      <p>{copy.stepNeedsCut}: {step.needsCut ? copy.needsCutYes : copy.needsCutNo}</p>
                      <p>
                        {locale === "es"
                          ? `Ruta: Nevera -> ${step.needsCut ? "Tabla -> " : ""}${step.stationLabel} -> Emplatado -> Entrega`
                          : `Route: Fridge -> ${step.needsCut ? "Board -> " : ""}${step.stationLabel} -> Plating -> Serving`}
                      </p>
                    </li>
                  ))}
                </ul>

                <p className="kitchen-rush-guide-flow-title">{copy.flowTitle}</p>
                <p className="kitchen-rush-guide-flow">{copy.routePlate} {copy.routeServe}</p>
              </article>
            ))}
          </div>
        )}
        <p className="kitchen-rush-guide-note">{copy.codedNote}</p>
      </section>

      <section>
        <h5>{copy.stationsTitle}</h5>
        <div className="kitchen-rush-station-list">
          {snapshot.stations.map((station) => (
            <article key={station.id} className={station.id === snapshot.nearestStationId ? "near" : ""}>
              <strong>{station.label}</strong>
              <p>{copy.stationTemp}: {station.temperature}C</p>
              {(station.type === "pan" || station.type === "oven" || station.type === "pot") && (
                <>
                  <p>{copy.stationTarget}: {(station.targetTemperature ?? station.temperature)}C</p>
                  <div className="kitchen-rush-temp-controls">
                    <button
                      type="button"
                      aria-label={copy.tempDownLabel}
                      onClick={() => onAdjustStationTarget(station.type, -1)}
                    >
                      -
                    </button>
                    <button
                      type="button"
                      aria-label={copy.tempUpLabel}
                      onClick={() => onAdjustStationTarget(station.type, 1)}
                    >
                      +
                    </button>
                  </div>
                  {station.targetPresets?.length > 0 && (
                    <div className="kitchen-rush-temp-presets" aria-label={copy.stationPresets}>
                      {station.targetPresets.map((preset) => (
                        <button
                          key={`${station.id}-${preset}`}
                          type="button"
                          className={(station.targetTemperature ?? station.temperature) === preset ? "active" : ""}
                          onClick={() => onSetStationTarget(station.type, preset)}
                        >
                          {preset}C
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
              <p>{copy.stationItems}: {station.itemCount}</p>
            </article>
          ))}
        </div>
      </section>

      <section>
        <h5>{copy.controlsTitle}</h5>
        <p>{copy.controlsText}</p>
      </section>

      <section className="kitchen-rush-tutorial">
        <h5>{copy.tutorialTitle}</h5>
        <ol>
          {copy.tutorialSteps.map((step, index) => (
            <li key={step}>
              <span>{index + 1}</span>
              <p>{step}</p>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}

export default KitchenRushAdvancedPanel;
