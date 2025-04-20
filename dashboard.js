fetch("data.json")
    .then(res => res.json())
    .then(data => {

        // Neighborhoods
        const neighborhoods = [...new Set(data.map(row => row.NeighborhoodName))];

        // Years sold
        const uniqueYears = [...new Set(data.map(d => +d.YrSold.split(".")[2]))]
            .sort((a, b) => a - b);

        // Overall Condition
        const conditions = [...new Set(data.map(d => d.OverallCond))]
            .sort((a, b) => a - b);

        // Find min and max sale price in the data
        const allPrices = data.map(d => d.SalePrice);
        const minPrice = Math.min(...allPrices);
        const maxPrice = Math.max(...allPrices);

        // Get references to the select elements & sliders
        const neighborhoodSelect = document.getElementById("neighborhoodSelect");
        const yearSelect = document.getElementById("yearSelect");
        const conditionSelect = document.getElementById("conditionSelect");

        const minPriceRange = document.getElementById("minPriceRange");
        const maxPriceRange = document.getElementById("maxPriceRange");

        const minPriceLabel = document.getElementById("minPriceLabel");
        const maxPriceLabel = document.getElementById("maxPriceLabel");

        const toggleBtn = document.getElementById("toggleBtn");
        const currentYear = document.getElementById("currentYear");

        // Neighborhood
        const defaultNeighborhoodOption = document.createElement("option");
        defaultNeighborhoodOption.value = "";
        defaultNeighborhoodOption.text = "All Neighborhoods";
        neighborhoodSelect.appendChild(defaultNeighborhoodOption);

        neighborhoods.forEach(n => {
            const option = document.createElement("option");
            option.value = n;
            option.text = n;
            neighborhoodSelect.appendChild(option);
        });

        // Year Sold
        const defaultYearOption = document.createElement("option");
        defaultYearOption.value = "";
        defaultYearOption.text = "All Years";
        yearSelect.appendChild(defaultYearOption);

        uniqueYears.forEach(y => {
            const option = document.createElement("option");
            option.value = y;
            option.text = y;
            yearSelect.appendChild(option);
        });

        // Condition
        const defaultConditionOption = document.createElement("option");
        defaultConditionOption.value = "";
        defaultConditionOption.text = "All Conditions";
        conditionSelect.appendChild(defaultConditionOption);

        const conditionLabels = {
            9: "Excellent",
            8: "Very Good",
            7: "Good",
            6: "Above Average",
            5: "Average",
            4: "Below Average",
            3: "Fair",
            2: "Poor",
            1: "Very Poor"
        };

        conditions.forEach(c => {
            const option = document.createElement("option");
            option.value = c;
            const desc = conditionLabels[c];
            option.text = `${c} - ${desc}`;
            conditionSelect.appendChild(option);
        });


        // Initialize the Price Range Sliders
        minPriceRange.min = minPrice;
        minPriceRange.max = maxPrice;
        minPriceRange.value = minPrice;
        minPriceRange.step = 1000;

        maxPriceRange.min = minPrice;
        maxPriceRange.max = maxPrice;
        maxPriceRange.value = maxPrice;
        maxPriceRange.step = 1000;

        minPriceLabel.textContent = minPriceRange.value;
        maxPriceLabel.textContent = maxPriceRange.value;

        // Listen for filter/slider changes
        neighborhoodSelect.addEventListener("change", updateCharts);
        yearSelect.addEventListener("change", updateCharts);
        conditionSelect.addEventListener("change", updateCharts);

        minPriceRange.addEventListener("input", () => {
            minPriceLabel.textContent = minPriceRange.value;
            if (+minPriceRange.value > +maxPriceRange.value) {
                maxPriceRange.value = minPriceRange.value;
                maxPriceLabel.textContent = maxPriceRange.value;
            }
            updateCharts();
        });

        maxPriceRange.addEventListener("input", () => {
            maxPriceLabel.textContent = maxPriceRange.value;
            if (+maxPriceRange.value < +minPriceRange.value) {
                minPriceRange.value = maxPriceRange.value;
                minPriceLabel.textContent = minPriceRange.value;
            }
            updateCharts();
        });

        // Play toggle button
        let isPlaying = false;
        let currentYearIndex = 0;
        let animationTimer = null;

        function stepAnimation() {
            if (!isPlaying) return;
            const thisYear = uniqueYears[currentYearIndex];
            yearSelect.value = thisYear;
            currentYear.textContent = `(Year: ${thisYear})`;
            updateCharts();
            currentYearIndex += 1;
            if (currentYearIndex >= uniqueYears.length) {
                currentYearIndex = 0;
            }
            animationTimer = setTimeout(stepAnimation, 2000);
        }

        toggleBtn.addEventListener("click", () => {
            if (!isPlaying) {
                isPlaying = true;
                toggleBtn.textContent = "Pause";
                stepAnimation();
            } else {
                isPlaying = false;
                toggleBtn.textContent = "Play";
                if (animationTimer) {
                    clearTimeout(animationTimer);
                }
            }
        });

        renderCharts(data);

        function updateCharts() {
            const selectedNeighborhood = neighborhoodSelect.value;
            const selectedYear = yearSelect.value;
            const selectedCondition = conditionSelect.value;
            const currentMinPrice = +minPriceRange.value;
            const currentMaxPrice = +maxPriceRange.value;

            let filtered = data;

            // Neighborhood filter
            if (selectedNeighborhood) {
                filtered = filtered.filter(
                    d => d.NeighborhoodName === selectedNeighborhood
                );
            }

            // Year Sold filter
            if (selectedYear) {
                filtered = filtered.filter(
                    d => +d.YrSold.split(".")[2] === +selectedYear
                );
            }

            // Condition filter
            if (selectedCondition) {
                filtered = filtered.filter(
                    d => +d.OverallCond === +selectedCondition
                );
            }

            // Price Range filter
            filtered = filtered.filter(
                d => +d.SalePrice >= currentMinPrice && +d.SalePrice <= currentMaxPrice
            );

            renderCharts(filtered);
        }

        function renderCharts(filteredData) {
            // Sale Price Distribution (Histogram)
            Plotly.newPlot("histogram", [{
                x: filteredData.map(d => +d.SalePrice),
                type: "histogram",
                marker: {
                    color: "#2874a6",
                }
            }], {
                title: "Sale Price Distribution",
                xaxis: { title: "Sale Price (USD)" },
                yaxis: { title: "Count" }
            });

            // GrLivArea vs SalePrice (Scatter)
            Plotly.newPlot("scatter", [{
                x: filteredData.map(d => +d.GrLivArea),
                y: filteredData.map(d => +d.SalePrice),
                mode: "markers",
                type: "scatter",
                marker: {
                    color: "#239b56",
                }
            }], {
                title: "GrLivArea vs SalePrice",
                xaxis: { title: "Above grade living area (sq ft)" },
                yaxis: { title: "Sale Price (USD)" }
            });

            // Sale Price by Neighborhood (Box Plot)
            const grouped = {};
            const boxColor = "#7E30E1";
            filteredData.forEach(d => {
                if (!grouped[d.NeighborhoodName]) {
                    grouped[d.NeighborhoodName] = [];
                }
                grouped[d.NeighborhoodName].push(+d.SalePrice);
            });
            const boxData = Object.entries(grouped).map(([name, values]) => ({
                y: values,
                name,
                type: "box",
                marker: { color: boxColor }
            }));
            Plotly.newPlot("boxplot", boxData, {
                title: "Sale Price by Neighborhood",
                xaxis: { title: "Neighborhood" },
                yaxis: { title: "Sale Price (USD)" },
                showlegend: false
            });

            // Average Sale Price Over Time
            const timeMap = {};
            filteredData.forEach(d => {
                const year = parseInt(d.YrSold.split(".")[2], 10);
                if (!timeMap[year]) {
                    timeMap[year] = [];
                }
                timeMap[year].push(+d.SalePrice);
            });

            const sortedYears = Object.keys(timeMap)
                .map(y => parseInt(y, 10))
                .sort((a, b) => a - b);

            const avgPrices = sortedYears.map(year => {
                const prices = timeMap[year];
                return prices.reduce((sum, price) => sum + price, 0) / prices.length;
            });

            Plotly.newPlot("timeseries", [{
                x: sortedYears,
                y: avgPrices,
                type: "scatter",
                marker: {
                    color: "#ca6f1e",
                },
                mode: "lines+markers"
            }], {
                title: "Average Sale Price Over Time",
                xaxis: { title: "Year Sold" },
                yaxis: { title: "Average Sale Price (USD)" }
            });
        }
    });